import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhoneNumberInput } from "@/components/ui/phone-input";

describe("PhoneNumberInput", () => {
  it("defaults to Singapore and lists countries with dial codes", () => {
    render(<PhoneNumberInput value="" onChange={() => {}} />);

    const countrySelect = screen.getByRole("combobox") as HTMLSelectElement;
    expect(countrySelect.value).toBe("SG");
    expect(screen.getByRole("option", { name: "Singapore (+65)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Philippines (+63)" })).toBeInTheDocument();
  });

  it("emits E.164 when a national number is typed", () => {
    const onChange = vi.fn();
    render(<PhoneNumberInput value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "+65 9123 4567" } });
    expect(onChange).toHaveBeenCalledWith("+6591234567");
  });

  it("shows a legacy local number against the default country", () => {
    render(<PhoneNumberInput value="91234567" onChange={() => {}} />);

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("SG");
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("+65 9123 4567");
  });

  it("picks the country from an existing international number", () => {
    render(<PhoneNumberInput value="+63 912 345 6789" onChange={() => {}} />);

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("PH");
  });
});
