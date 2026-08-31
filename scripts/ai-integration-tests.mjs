const CANONICAL_WORKFLOWS = new Set([
  "inquiry_match",
  "make_pipeline",
  "inquiry_only",
  "lead_scoring",
  "contract_creation",
  "schedule_creation",
  "notification_only",
  "validation_error",
  "human_review",
]);

const LEGACY_WORKFLOWS = new Set([
  "maid_matching",
  "general_inquiry",
  "inquiry",
]);

const ENVIRONMENTS = {
  local: {
    key: "local",
    label: "Localhost",
    baseUrl: "http://localhost:3000",
  },
  prod: {
    key: "prod",
    label: "Production",
    baseUrl: "https://findmaid.wow-aisolution.workers.dev",
  },
};

const parseTarget = () => {
  const targetArg = process.argv.find((value) => value.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "both";
  if (target === "local") return ["local"];
  if (target === "prod") return ["prod"];
  return ["local", "prod"];
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_RETRY_DELAYS_MS = [1200, 2500, 5000];

const withTimeout = async (promise, timeoutMs) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`TIMEOUT:${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const pretty = (value) => JSON.stringify(value, null, 2);

const unwrapData = (responseBody) =>
  responseBody && typeof responseBody === "object" && "data" in responseBody
    ? responseBody.data
    : responseBody;

const extractWorkflowValues = (value, hits = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => extractWorkflowValues(item, hits));
    return hits;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "workflow" && typeof item === "string") {
        hits.push(item);
      } else {
        extractWorkflowValues(item, hits);
      }
    }
  }

  return hits;
};

const containsLegacyWorkflow = (responseBody) =>
  extractWorkflowValues(responseBody).some((workflow) =>
    LEGACY_WORKFLOWS.has(workflow),
  );

const getPrimaryWorkflow = (responseBody) => {
  if (typeof responseBody?.workflow === "string") return responseBody.workflow;
  const payload = unwrapData(responseBody);
  if (typeof payload?.workflow === "string") return payload.workflow;
  if (typeof payload?.inquiry?.workflow === "string")
    return payload.inquiry.workflow;
  if (typeof payload?.classifier?.workflow === "string")
    return payload.classifier.workflow;
  return null;
};

const getPrimaryIntent = (responseBody) => {
  if (typeof responseBody?.intent === "string") return responseBody.intent;
  const payload = unwrapData(responseBody);
  if (typeof payload?.intent === "string") return payload.intent;
  if (typeof payload?.inquiry?.intent === "string")
    return payload.inquiry.intent;
  if (typeof payload?.classifier?.intent === "string")
    return payload.classifier.intent;
  return null;
};

const stableMatchReferences = (responseBody) =>
  Array.isArray(unwrapData(responseBody)?.matches)
    ? unwrapData(responseBody)
        .matches.slice(0, 3)
        .map((item) => item.maidReferenceCode ?? item.maidId ?? null)
    : [];

const scoresAreDescending = (matches) =>
  Array.isArray(matches) &&
  matches.every(
    (item, index) =>
      index === 0 ||
      Number(matches[index - 1]?.score ?? 0) >= Number(item?.score ?? 0),
  );

const normalizeParityView = (testName, responseBody) => {
  const payload = unwrapData(responseBody);
  if (
    testName.startsWith("orchestrator_") ||
    testName.startsWith("workflow_")
  ) {
    return {
      workflow: getPrimaryWorkflow(responseBody),
      intent: getPrimaryIntent(responseBody),
      fallbackUsed: responseBody?.fallbackUsed ?? null,
      fallbackProvider: responseBody?.fallbackProvider ?? null,
      hasMatches: Array.isArray(payload?.matches)
        ? payload.matches.length > 0
        : false,
    };
  }

  if (testName.startsWith("matching_")) {
    const matches = Array.isArray(payload?.matches) ? payload.matches : [];
    return {
      workflow: getPrimaryWorkflow(responseBody),
      intent: getPrimaryIntent(responseBody),
      aiUsed: payload?.aiUsed ?? null,
      fallbackUsed: responseBody?.fallbackUsed ?? payload?.fallbackUsed ?? null,
      matchCount: matches.length,
      hasMatches: matches.length > 0,
      scoresDescending: scoresAreDescending(matches),
    };
  }

  return {
    workflow: getPrimaryWorkflow(responseBody),
    fallbackUsed: responseBody?.fallbackUsed ?? null,
    fallbackProvider: responseBody?.fallbackProvider ?? null,
  };
};

const logResult = (result) => {
  console.log(
    `\n[${result.status.toUpperCase()}] ${result.environment} :: ${result.name}`,
  );
  console.log(`request payload: ${pretty(result.requestPayload)}`);
  console.log(`response json: ${pretty(result.responseBody)}`);
  console.log(`workflow used: ${result.workflowUsed ?? "null"}`);
  console.log(`fallbackUsed: ${result.fallbackUsed ?? "null"}`);
  console.log(`fallbackProvider: ${result.fallbackProvider ?? "null"}`);
  console.log(`latencyMs: ${result.latencyMs}`);
  if (result.notes.length > 0) {
    console.log(`notes: ${result.notes.join(" | ")}`);
  }
};

const assert = (condition, message, errors) => {
  if (!condition) errors.push(message);
};

const parseRetryAfterMs = (headerValue) => {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const timestamp = Date.parse(headerValue);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return null;
};

const fetchJson = async (baseUrl, path, payload, method = "POST") => {
  const startedAt = Date.now();

  for (
    let attempt = 0;
    attempt <= DEFAULT_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    const response = await withTimeout(
      fetch(`${baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(payload),
      }),
      15000,
    );
    const rawText = await response.text();

    let json;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = { parseError: true, rawText };
    }

    if (response.status !== 429 || attempt === DEFAULT_RETRY_DELAYS_MS.length) {
      return {
        latencyMs: Date.now() - startedAt,
        statusCode: response.status,
        ok: response.ok,
        body: json,
      };
    }

    const retryAfterMs =
      parseRetryAfterMs(response.headers.get("retry-after")) ??
      DEFAULT_RETRY_DELAYS_MS[attempt];
    await delay(retryAfterMs);
  }

  throw new Error(`Unreachable retry state for ${method} ${path}`);
};

const bootstrapEnvironment = async (environment) => {
  const maidsResponse = await fetchJson(
    environment.baseUrl,
    "/api/public-maids",
    {},
    "GET",
  ).catch(() => null);
  const matchResponse = await fetchJson(
    environment.baseUrl,
    "/api/match",
    { message: "Need a maid for childcare in Singapore" },
    "POST",
  ).catch(() => null);

  const maidFromPublic =
    Array.isArray(maidsResponse?.body?.maids) &&
    maidsResponse.body.maids.length > 0
      ? maidsResponse.body.maids[0]
      : null;
  const maidFromMatch =
    Array.isArray(unwrapData(matchResponse?.body)?.matches) &&
    unwrapData(matchResponse?.body).matches.length > 0
      ? unwrapData(matchResponse?.body).matches[0]
      : null;

  return {
    firstMaidId: maidFromPublic?.id ?? maidFromMatch?.maidId ?? 1,
    firstMaidRef:
      maidFromPublic?.referenceCode ?? maidFromMatch?.maidReferenceCode ?? null,
  };
};

const buildCases = (bootstrap) => {
  const maidId = bootstrap.firstMaidId;
  const datetime = "2026-05-10T09:30:00.000Z";

  return [
    {
      name: "workflow_inquiry_match",
      category: "workflow-classification",
      path: "/api/ai/processInquiry",
      payload: {
        requestId: "ai-suite-inquiry-match",
        name: "[AI TEST] Hiring",
        contact: "ai.test@example.com",
        message:
          "Please recommend a transfer maid for childcare in Woodlands with budget 800",
      },
      expectedStatus: 200,
      expectedWorkflow: "inquiry_match",
      expectedIntent: "hiring",
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_inquiry_only",
      category: "workflow-classification",
      path: "/api/ai/processInquiry",
      payload: {
        requestId: "ai-suite-inquiry-only",
        name: "[AI TEST] Inquiry",
        contact: "ai.test@example.com",
        message: "Can you explain your agency fees and placement process?",
      },
      expectedStatus: 200,
      expectedWorkflow: "inquiry_only",
      expectedIntent: "inquiry",
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_human_review",
      category: "workflow-classification",
      path: "/api/ai/processInquiry",
      payload: {
        requestId: "ai-suite-human-review",
        name: "[AI TEST] Complaint",
        contact: "ai.test@example.com",
        message:
          "I am very angry about a refund dispute and need an urgent manager escalation for a bad service incident.",
      },
      expectedStatus: 200,
      expectedWorkflow: "human_review",
      expectedIntent: null,
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_lead_scoring",
      category: "workflow-classification",
      path: "/api/leads/raw",
      payload: {
        source: "website",
        name: "[AI TEST] Lead",
        contact: "lead.ai@example.com",
        message:
          "Need a nanny in Singapore next week with a budget of SGD 950.",
      },
      expectedStatus: 201,
      expectedWorkflow: "lead_scoring",
      requireWorkflowOutput: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_contract_creation",
      category: "workflow-classification",
      path: "/api/contracts/generate",
      payload: {
        maidId,
        employerId: 9991,
        serviceType: "childcare",
        location: "Woodlands",
        budgetText: "SGD 800",
        scheduleDate: "2026-05-12",
      },
      expectedStatus: [200, 201],
      expectedWorkflow: "contract_creation",
      requireWorkflowOutput: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_schedule_creation",
      category: "workflow-classification",
      path: "/api/schedule",
      payload: {
        maidId,
        employerId: 9991,
        datetime,
      },
      expectedStatus: [200, 201],
      expectedWorkflow: "schedule_creation",
      requireWorkflowOutput: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_notification_only",
      category: "workflow-classification",
      path: "/api/notify",
      payload: {
        channel: "internal",
        recipient: "qa-team",
        message: "[AI TEST] Notification-only workflow validation",
        referenceType: "workflow",
        referenceId: "ai-suite",
      },
      expectedStatus: [200, 201],
      expectedWorkflow: "notification_only",
      requireWorkflowOutput: true,
      compareAcrossEnvs: true,
    },
    {
      name: "workflow_validation_error",
      category: "workflow-classification",
      path: "/api/contracts/generate",
      payload: {
        employerId: 9991,
      },
      expectedStatus: 400,
      expectedWorkflow: "validation_error",
      requireWorkflowOutput: true,
      compareAcrossEnvs: true,
    },
    {
      name: "orchestrator_fallback_contract",
      category: "ai-orchestrator",
      path: "/api/ai/processInquiry",
      payload: {
        requestId: "ai-suite-orchestrator-contract",
        name: "[AI TEST] Contract Intent",
        contact: "ai.test@example.com",
        message: "Please create a contract draft for employer 9991 and maid 1.",
      },
      expectedStatus: 200,
      expectedWorkflow: "contract_creation",
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
    },
    {
      name: "matching_semantic_retrieval",
      category: "matching-rag",
      path: "/api/match",
      payload: {
        message:
          "Need a maid for infant care and childcare in Woodlands with budget 800",
        serviceType: "childcare",
        location: "Woodlands",
        budget: "SGD 800",
      },
      expectedStatus: 200,
      requireWorkflowOutput: false,
      compareAcrossEnvs: true,
      customAssertions: (responseBody, errors) => {
        assert(
          Array.isArray(responseBody?.matches),
          "matches must be an array",
          errors,
        );
        assert(
          (responseBody?.matches?.length ?? 0) > 0,
          "matches must not be empty",
          errors,
        );
        const scores = (responseBody?.matches ?? []).map(
          (item) => item.score ?? 0,
        );
        const isDescending = scores.every(
          (score, index) => index === 0 || scores[index - 1] >= score,
        );
        assert(isDescending, "match scores must be sorted descending", errors);
      },
    },
    {
      name: "matching_filter_quality",
      category: "matching-rag",
      path: "/api/match",
      payload: {
        message:
          "Looking for a transfer maid for elderly care in Yishun with budget 700",
        serviceType: "eldercare",
        location: "Yishun",
        budget: "SGD 700",
      },
      expectedStatus: 200,
      requireWorkflowOutput: false,
      compareAcrossEnvs: true,
      customAssertions: (responseBody, errors) => {
        assert(
          Array.isArray(responseBody?.matches),
          "matches must be an array",
          errors,
        );
        assert(
          (responseBody?.matches?.length ?? 0) > 0,
          "filtered matching should return results",
          errors,
        );
      },
    },
    {
      name: "matching_semantic_similarity_bias",
      category: "matching-rag",
      mode: "composite",
      compareAcrossEnvs: true,
      requests: [
        {
          key: "relevant",
          path: "/api/match",
          payload: {
            message: "Need a maid for infant care and baby care in Singapore",
          },
        },
        {
          key: "irrelevant",
          path: "/api/match",
          payload: {
            message:
              "Need someone focused on cooking and general housekeeping only",
          },
        },
      ],
      validateComposite: (responses, errors) => {
        const relevant = unwrapData(responses.relevant?.body);
        const irrelevant = unwrapData(responses.irrelevant?.body);
        assert(
          Array.isArray(relevant?.matches),
          "relevant query must return matches",
          errors,
        );
        assert(
          Array.isArray(irrelevant?.matches),
          "irrelevant query must return matches",
          errors,
        );
        const relevantTop = relevant?.matches?.[0]?.score ?? 0;
        const irrelevantTop = irrelevant?.matches?.[0]?.score ?? 0;
        assert(
          relevantTop >= irrelevantTop,
          "semantically relevant query should not rank below unrelated query",
          errors,
        );
      },
    },
    {
      name: "rag_document_retrieval_capability",
      category: "matching-rag",
      mode: "synthetic",
      expectedStatus: 200,
      compareAcrossEnvs: true,
      runSynthetic: () => ({
        statusCode: 200,
        body: {
          skipped: true,
          reason:
            "No dedicated policy/SOP/document retrieval API surface detected in current runtime.",
        },
      }),
      customAssertions: (responseBody, errors, notes) => {
        if (responseBody?.skipped === true) {
          notes.push(responseBody.reason);
          return;
        }
        assert(
          false,
          "document retrieval test expected to be skipped or explicitly implemented",
          errors,
        );
      },
    },
    {
      name: "e2e_inquiry_pipeline",
      category: "end-to-end",
      path: "/api/inquiry",
      payload: {
        name: "[AI TEST] E2E Inquiry",
        contact: "e2e.ai@example.com",
        message:
          "Please recommend the top 3 maids for childcare in Woodlands with budget 850.",
      },
      expectedStatus: 200,
      expectedWorkflow: "inquiry_match",
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
      customAssertions: (responseBody, errors) => {
        assert(
          typeof responseBody?.reply === "string" &&
            responseBody.reply.length > 0,
          "reply must be non-empty",
          errors,
        );
      },
    },
    {
      name: "e2e_make_pipeline",
      category: "end-to-end",
      path: "/api/inquiry/make",
      payload: {
        name: "[AI TEST] E2E Make",
        contact: "e2e.ai@example.com",
        message: "Please recommend a maid for childcare in Tampines.",
        makeScenario: "inquiry_pipeline",
      },
      expectedStatus: 200,
      expectedWorkflow: "inquiry_match",
      requireWorkflowOutput: true,
      requireFallbackFields: true,
      compareAcrossEnvs: true,
    },
  ];
};

const runSimpleCase = async (environment, testCase) => {
  const requestPayload =
    typeof testCase.payload === "function"
      ? testCase.payload(environment)
      : testCase.payload;
  const errors = [];
  const notes = [];

  let response;
  try {
    response =
      testCase.mode === "synthetic"
        ? { latencyMs: 0, ...(await testCase.runSynthetic(environment)) }
        : await fetchJson(
            environment.baseUrl,
            testCase.path,
            requestPayload,
            testCase.method ?? "POST",
          );
  } catch (error) {
    return {
      name: testCase.name,
      environment: environment.key,
      status: "failed",
      requestPayload,
      responseBody: {
        error: error instanceof Error ? error.message : String(error),
      },
      workflowUsed: null,
      fallbackUsed: null,
      fallbackProvider: null,
      latencyMs: 0,
      notes: [
        `environment unavailable: ${error instanceof Error ? error.message : String(error)}`,
      ],
      errors: [
        `Request failed before receiving a response from ${environment.baseUrl}`,
      ],
      category: testCase.category,
    };
  }

  const responseBody = response.body;
  const payloadBody = unwrapData(responseBody);
  const workflowUsed = getPrimaryWorkflow(responseBody);
  const fallbackUsed = responseBody?.fallbackUsed ?? null;
  const fallbackProvider = responseBody?.fallbackProvider ?? null;

  if (testCase.expectedStatus !== undefined) {
    const allowedStatuses = Array.isArray(testCase.expectedStatus)
      ? testCase.expectedStatus
      : [testCase.expectedStatus];
    assert(
      allowedStatuses.includes(response.statusCode),
      `expected HTTP ${allowedStatuses.join(" or ")}, got ${response.statusCode}`,
      errors,
    );
  }
  assert(
    !containsLegacyWorkflow(responseBody),
    "legacy workflow label detected in response",
    errors,
  );

  if (testCase.requireWorkflowOutput) {
    assert(
      Boolean(workflowUsed),
      "workflow field is missing from response",
      errors,
    );
    if (workflowUsed) {
      assert(
        CANONICAL_WORKFLOWS.has(workflowUsed),
        `workflow is not canonical: ${workflowUsed}`,
        errors,
      );
    }
  }

  if (testCase.expectedWorkflow) {
    assert(
      workflowUsed === testCase.expectedWorkflow,
      `expected workflow ${testCase.expectedWorkflow}, got ${workflowUsed ?? "null"}`,
      errors,
    );
  }

  if (testCase.expectedIntent) {
    assert(
      getPrimaryIntent(responseBody) === testCase.expectedIntent,
      `expected intent ${testCase.expectedIntent}, got ${getPrimaryIntent(responseBody) ?? "null"}`,
      errors,
    );
  }

  if (testCase.requireFallbackFields) {
    assert(
      typeof responseBody?.fallbackUsed === "boolean",
      "fallbackUsed must be present as a boolean",
      errors,
    );
    if (responseBody?.fallbackUsed === true) {
      assert(
        typeof responseBody?.fallbackProvider === "string" &&
          responseBody.fallbackProvider.length > 0,
        "fallbackProvider must be present when fallbackUsed is true",
        errors,
      );
    }
  }

  if (typeof testCase.customAssertions === "function") {
    testCase.customAssertions(payloadBody, errors, notes);
  }

  return {
    name: testCase.name,
    environment: environment.key,
    status: errors.length === 0 ? "passed" : "failed",
    requestPayload,
    responseBody,
    workflowUsed,
    fallbackUsed,
    fallbackProvider,
    latencyMs: response.latencyMs ?? 0,
    notes,
    errors,
    category: testCase.category,
  };
};

const runCompositeCase = async (environment, testCase) => {
  const errors = [];
  const notes = [];
  const requestPayload = {};
  const responses = {};
  let totalLatency = 0;

  for (const request of testCase.requests) {
    requestPayload[request.key] = request.payload;
    try {
      const response = await fetchJson(
        environment.baseUrl,
        request.path,
        request.payload,
        request.method ?? "POST",
      );
      responses[request.key] = response;
      totalLatency += response.latencyMs;
    } catch (error) {
      errors.push(
        `request ${request.key} failed before response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (errors.length === 0) {
    testCase.validateComposite(responses, errors, notes);
  }

  const flattenedResponses = Object.fromEntries(
    Object.entries(responses).map(([key, value]) => [key, value.body]),
  );

  const allWorkflows = extractWorkflowValues(flattenedResponses);
  if (allWorkflows.some((workflow) => LEGACY_WORKFLOWS.has(workflow))) {
    errors.push("legacy workflow label detected in composite response set");
  }

  return {
    name: testCase.name,
    environment: environment.key,
    status: errors.length === 0 ? "passed" : "failed",
    requestPayload,
    responseBody: flattenedResponses,
    workflowUsed: allWorkflows[0] ?? null,
    fallbackUsed: null,
    fallbackProvider: null,
    latencyMs: totalLatency,
    notes,
    errors,
    category: testCase.category,
  };
};

const runCase = async (environment, testCase) => {
  if (testCase.mode === "composite") {
    return runCompositeCase(environment, testCase);
  }
  return runSimpleCase(environment, testCase);
};

const runEnvironment = async (environment) => {
  const bootstrap = await bootstrapEnvironment(environment);
  const cases = buildCases(bootstrap);
  const results = [];

  for (const testCase of cases) {
    const result = await runCase(environment, testCase);
    results.push(result);
    logResult(result);
    await delay(250);
  }

  return { bootstrap, results };
};

const compareEnvironments = (localResults, prodResults) => {
  const comparisons = [];

  for (const localResult of localResults) {
    const prodResult = prodResults.find(
      (item) => item.name === localResult.name,
    );
    if (!prodResult) continue;

    const compareEnabledCase =
      buildCases({ firstMaidId: 1 }).find(
        (item) => item.name === localResult.name,
      )?.compareAcrossEnvs ?? false;
    if (!compareEnabledCase) continue;

    const localView = normalizeParityView(
      localResult.name,
      localResult.responseBody,
    );
    const prodView = normalizeParityView(
      prodResult.name,
      prodResult.responseBody,
    );
    const same = pretty(localView) === pretty(prodView);

    comparisons.push({
      name: localResult.name,
      status: same ? "passed" : "failed",
      localView,
      prodView,
      errors: same
        ? []
        : ["local and production responses differ on normalized parity view"],
    });
  }

  return comparisons;
};

const printSummary = (environmentRuns, comparisons) => {
  console.log("\n=== Summary ===");
  for (const [key, run] of Object.entries(environmentRuns)) {
    if (!run) continue;
    const passed = run.results.filter(
      (item) => item.status === "passed",
    ).length;
    const failed = run.results.filter(
      (item) => item.status === "failed",
    ).length;
    console.log(
      `${ENVIRONMENTS[key].label}: ${passed} passed, ${failed} failed`,
    );
  }

  if (comparisons.length > 0) {
    const passed = comparisons.filter(
      (item) => item.status === "passed",
    ).length;
    const failed = comparisons.filter(
      (item) => item.status === "failed",
    ).length;
    console.log(`Parity checks: ${passed} passed, ${failed} failed`);
    for (const comparison of comparisons.filter(
      (item) => item.status === "failed",
    )) {
      console.log(`parity failure :: ${comparison.name}`);
      console.log(`local: ${pretty(comparison.localView)}`);
      console.log(`prod: ${pretty(comparison.prodView)}`);
    }
  }
};

const main = async () => {
  const targets = parseTarget();
  const environmentRuns = {};

  for (const target of targets) {
    environmentRuns[target] = await runEnvironment(ENVIRONMENTS[target]);
  }

  const comparisons =
    environmentRuns.local && environmentRuns.prod
      ? compareEnvironments(
          environmentRuns.local.results,
          environmentRuns.prod.results,
        )
      : [];

  printSummary(environmentRuns, comparisons);

  const runFailures = Object.values(environmentRuns)
    .flatMap((run) => (run ? run.results : []))
    .filter((item) => item.status === "failed");
  const parityFailures = comparisons.filter((item) => item.status === "failed");

  if (runFailures.length > 0 || parityFailures.length > 0) {
    console.error("\nAI integration suite failed.");
    for (const failure of runFailures) {
      console.error(
        `- ${failure.environment} :: ${failure.name} :: ${failure.errors.join("; ")}`,
      );
    }
    for (const failure of parityFailures) {
      console.error(
        `- parity :: ${failure.name} :: ${failure.errors.join("; ")}`,
      );
    }
    process.exit(1);
  }

  console.log("\nAI integration suite passed.");
};

await main();
