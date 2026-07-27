"use server";
import { parse } from "csv-parse/sync";
import { Faq } from "@/components/faq/types";

const PUBLISH_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQx6niffkvzl0oRBXw4G4Khy6p7nsVeYrBw5cY0cj6f5Z3Hc7_YfmsxgZbunsZjnAEVJFgYLx0g-bIQ/pub?output=csv";

export async function getFaqs() {
  try {
  const res = await fetch(PUBLISH_URL, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const csvText = await res.text();
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return { data: records as Faq[], error: null }; 
  } catch {
    return {data: null, error: "Failed to load FAQ" };
  }
};
