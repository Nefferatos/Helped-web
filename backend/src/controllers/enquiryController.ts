import { Request, Response } from "express";
import { getAuthenticatedClient, getRequestAgencyId } from "../auth";
import {
  addEnquiryStore,
  createChatMessageStore,
  deleteEnquiryStore,
  getClientByEmailStore,
  getEnquiriesStore,
  updateEnquiryStore,
  type EnquiryStatus,
} from "../store";
import {
  extractEnquiry,
  formatEnquiryJson,
  type ExtractedEnquiry,
} from "../lib/enquiryExtractor";
import {
  formatEnquiryForSupport,
  generateSupportMessage,
  mapEnquiryToCategory,
  mapUrgencyToPriority,
} from "../lib/enquiryToSupportIntegration";

const VALID_ENQUIRY_STATUSES: EnquiryStatus[] = [
  "new",
  "in_progress",
  "replied",
  "resolved",
];

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const agencyId = await getRequestAgencyId(req);
    const enquiries = await getEnquiriesStore(
      typeof search === "string" ? search : undefined,
      agencyId,
    );
    res.status(200).json({ enquiries });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({ error: "Failed to fetch enquiries" });
  }
};

export const getUnreadEnquiryCount = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req);
    const enquiries = await getEnquiriesStore(undefined, agencyId);

    res.status(200).json({
      unreadCount: enquiries.length,
      count: enquiries.length,
    });
  } catch (error) {
    console.error("Error fetching unread enquiry count:", error);
    res.status(500).json({ error: "Failed to fetch unread enquiry count" });
  }
};

export const createEnquiry = async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      agencyId?: number;
      username?: string;
      date?: string;
      email?: string;
      phone?: string;
      message?: string;
    };
    const requestedAgencyId = Number(body.agencyId);
    const agencyId =
      Number.isInteger(requestedAgencyId) && requestedAgencyId > 0
        ? requestedAgencyId
        : await getRequestAgencyId(req);
    const { username, date, email, phone, message } = body;

    if (!username || !email || !phone || !message) {
      return res
        .status(400)
        .json({ error: "username, email, phone, and message are required" });
    }

    const authenticatedClient = await getAuthenticatedClient(req);
    const matchedClient =
      authenticatedClient &&
      authenticatedClient.email.trim().toLowerCase() ===
        email.trim().toLowerCase()
        ? authenticatedClient
        : await getClientByEmailStore(email);

    const enquiry = await addEnquiryStore(
      {
        username,
        date:
          date ||
          new Date().toLocaleString("en-SG", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        email,
        phone,
        message,
        clientId: matchedClient?.id,
        clientName: matchedClient?.name || undefined,
      },
      agencyId,
    );

    if (matchedClient) {
      await createChatMessageStore({
        clientId: matchedClient.id,
        conversationType: "support",
        agencyId,
        senderRole: "client",
        senderName: matchedClient.name || username,
        message: message.trim(),
      });
    }

    res.status(201).json({ enquiry });
  } catch (error) {
    console.error("Error creating enquiry:", error);
    res.status(500).json({ error: "Failed to create enquiry" });
  }
};

export const updateEnquiry = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Valid id is required" });
    }

    const body = req.body as {
      status?: unknown;
      note?: unknown;
      assignedTo?: unknown;
    };

    const patch: {
      status?: EnquiryStatus;
      note?: string;
      assignedTo?: string;
    } = {};

    if (body.status !== undefined) {
      if (
        typeof body.status !== "string" ||
        !VALID_ENQUIRY_STATUSES.includes(body.status as EnquiryStatus)
      ) {
        return res.status(400).json({
          error: `status must be one of: ${VALID_ENQUIRY_STATUSES.join(", ")}`,
        });
      }
      patch.status = body.status as EnquiryStatus;
    }
    if (body.note !== undefined) {
      if (typeof body.note !== "string") {
        return res.status(400).json({ error: "note must be a string" });
      }
      patch.note = body.note.slice(0, 5000);
    }
    if (body.assignedTo !== undefined) {
      if (typeof body.assignedTo !== "string") {
        return res.status(400).json({ error: "assignedTo must be a string" });
      }
      patch.assignedTo = body.assignedTo.slice(0, 200);
    }

    const updated = await updateEnquiryStore(id, patch, agencyId);
    if (!updated) {
      return res.status(404).json({ error: "Enquiry not found" });
    }

    res.status(200).json({ enquiry: updated });
  } catch (error) {
    console.error("Error updating enquiry:", error);
    res.status(500).json({ error: "Failed to update enquiry" });
  }
};

export const deleteEnquiry = async (req: Request, res: Response) => {
  try {
    const agencyId = await getRequestAgencyId(req);
    const { id } = req.params;
    const deleted = await deleteEnquiryStore(Number(id), agencyId);

    if (!deleted) {
      return res.status(404).json({ error: "Enquiry not found" });
    }

    res.status(200).json({ message: "Enquiry deleted successfully" });
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    res.status(500).json({ error: "Failed to delete enquiry" });
  }
};

/**
 * Extract structured enquiry from raw text submission
 * POST /api/enquiries/extract
 * Body: { rawText: string, email?: string, phone?: string, username?: string }
 */
export const extractRawEnquiry = async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      rawText?: string;
      email?: string;
      phone?: string;
      username?: string;
      agencyId?: number;
    };

    if (!body.rawText || typeof body.rawText !== "string") {
      return res.status(400).json({ error: "rawText is required" });
    }

    // Extract structured data from raw text
    const extracted: ExtractedEnquiry = extractEnquiry(body.rawText);

    // Optionally save to database if contact info provided
    let savedEnquiry = null;
    if (body.email && body.username && body.phone) {
      const agencyId =
        body.agencyId || (await getRequestAgencyId(req).catch(() => 1));
      const authenticatedClient = await getAuthenticatedClient(req).catch(
        () => null,
      );
      const matchedClient =
        authenticatedClient &&
        authenticatedClient.email.trim().toLowerCase() ===
          body.email.trim().toLowerCase()
          ? authenticatedClient
          : await getClientByEmailStore(body.email).catch(() => null);

      savedEnquiry = await addEnquiryStore(
        {
          username: body.username,
          email: body.email,
          phone: body.phone,
          message: body.rawText,
          date: new Date().toLocaleString("en-SG", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          clientId: matchedClient?.id,
          clientName: matchedClient?.name,
        },
        agencyId,
      );

      if (matchedClient) {
        const supportMessage = generateSupportMessage(extracted);
        await createChatMessageStore({
          clientId: matchedClient.id,
          conversationType: "support",
          agencyId,
          senderRole: "client",
          senderName: matchedClient.name || body.username,
          message: supportMessage,
        });
      }
    }

    res.status(200).json({
      extracted,
      savedEnquiry: savedEnquiry || null,
      json: formatEnquiryJson(extracted),
    });
  } catch (error) {
    console.error("Error extracting enquiry:", error);
    res.status(500).json({ error: "Failed to extract enquiry" });
  }
};
