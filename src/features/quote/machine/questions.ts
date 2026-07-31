import { z } from "zod";
import type { Option } from "../data/catalog";
import type { AnswerKey, QuoteAnswers } from "../types";

export type QuestionType =
  | "cards"
  | "multi"
  | "select"
  | "text"
  | "tel"
  | "email"
  | "textarea"
  | "date"
  | "checkbox";

export type Format = "email" | "phone" | "postal" | "vin" | "plain";

export interface Question {
  key: AnswerKey;
  label: string;
  help?: string;
  optionalNote?: string;
  type: QuestionType;
  format?: Format;
  options?: Option[] | ((a: QuoteAnswers) => Option[]);
  required?: boolean | ((a: QuoteAnswers) => boolean);
  visible?: (a: QuoteAnswers) => boolean;
  columns?: 1 | 2;
  placeholder?: string;
  /** Advance to the next step automatically when a card is chosen. */
  autoAdvance?: boolean;
  /** Contextual advisory shown under the question based on current answers. */
  advisory?: (a: QuoteAnswers) => { tone: "info" | "warn"; text: string } | undefined;
  /** Answers cleared when this question's value changes. */
  resets?: AnswerKey[];
}

export const isQuestionVisible = (q: Question, a: QuoteAnswers) => !q.visible || q.visible(a);

export const isQuestionRequired = (q: Question, a: QuoteAnswers) =>
  typeof q.required === "function" ? q.required(a) : Boolean(q.required);

export const questionOptions = (q: Question, a: QuoteAnswers): Option[] =>
  typeof q.options === "function" ? q.options(a) : (q.options ?? []);

const POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const PHONE = /^[+()\-.\s\d]{10,20}$/;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;

/** Build a Zod schema for the currently visible questions of a step. */
export function buildStepSchema(questions: Question[], a: QuoteAnswers) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const q of questions.filter((x) => isQuestionVisible(x, a))) {
    const required = isQuestionRequired(q, a);

    if (q.type === "multi") {
      shape[q.key] = required
        ? z.array(z.string()).min(1, "Please choose at least one option.")
        : z.array(z.string()).optional();
      continue;
    }

    if (q.type === "checkbox") {
      shape[q.key] = required
        ? z.boolean().refine((v) => v === true, { message: "Please confirm to continue." })
        : z.boolean().optional();
      continue;
    }

    let base = z.string().trim();
    let schema: z.ZodTypeAny = required
      ? base.min(1, q.type === "cards" ? "Please choose an option." : "This field is required.")
      : base.optional();

    if (q.format === "email") {
      schema = required
        ? base.min(1, "Email is required.").email("Enter a valid email address.")
        : base.email("Enter a valid email address.").optional().or(z.literal(""));
    } else if (q.format === "phone") {
      schema = required
        ? base.min(1, "Phone number is required.").regex(PHONE, "Enter a valid phone number.")
        : base.regex(PHONE, "Enter a valid phone number.").optional().or(z.literal(""));
    } else if (q.format === "postal") {
      schema = required
        ? base.min(1, "Postal code is required.").regex(POSTAL, "Enter a valid postal code (e.g. S7K 1A1).")
        : base.regex(POSTAL, "Enter a valid postal code (e.g. S7K 1A1).").optional().or(z.literal(""));
    } else if (q.format === "vin") {
      schema = base
        .refine((v) => !v || VIN.test(v), "A VIN is 17 characters and cannot contain I, O or Q.")
        .optional()
        .or(z.literal(""));
    }

    if (q.type === "textarea" || q.type === "text") {
      schema = required
        ? (schema as z.ZodString).max?.(1000, "Please keep this under 1000 characters.") ?? schema
        : schema;
    }

    shape[q.key] = schema;
  }

  return z.object(shape);
}

export function stepDefaults(questions: Question[], a: QuoteAnswers) {
  const values: Record<string, unknown> = {};
  for (const q of questions) {
    const current = a[q.key];
    if (q.type === "multi") values[q.key] = (current as string[] | undefined) ?? [];
    else if (q.type === "checkbox") values[q.key] = (current as boolean | undefined) ?? false;
    else values[q.key] = (current as string | undefined) ?? "";
  }
  return values;
}
