import type { CandidateProfile } from "./schema.js";

export type AnswerResolution =
  | { decision: "answer"; value: string; source: "profile" | "explicit_known_answer" }
  | { decision: "manual"; reason: "sensitive_or_legal" | "unknown" };

const sensitivePatterns = [
  /authori[sz]ed to work/i,
  /sponsor(ship)?/i,
  /visa/i,
  /citizen(ship)?/i,
  /security clearance/i,
  /salary|compensation|pay expectation/i,
  /relocat(e|ion)/i,
  /disab(ility|led)/i,
  /veteran/i,
  /gender|race|ethnicity/i,
  /criminal|conviction/i,
  /background check/i,
  /drug test/i,
  /non[- ]compete/i,
];

export function resolveProfileAnswer(label: string, profile: CandidateProfile): AnswerResolution {
  const canonicalLabel = canonicalize(label);

  const exactKnownAnswer = Object.entries(profile.knownAnswers).find(
    ([question]) => canonicalize(question) === canonicalLabel,
  );
  if (exactKnownAnswer) {
    return {
      decision: "answer",
      value: String(exactKnownAnswer[1]),
      source: "explicit_known_answer",
    };
  }

  const contactAnswers: Array<[RegExp, string]> = [
    [/^first name$/, profile.identity.firstName],
    [/^last name$/, profile.identity.lastName],
    [/(^| )email( address)?$/, profile.identity.email],
    [/(^| )(phone|mobile)( number)?$/, profile.identity.phone],
    [/^city$/, profile.location.city],
    [/^(state|province)$/, profile.location.state],
    [/^country$/, profile.location.country],
  ];

  const profileAnswer = contactAnswers.find(([pattern]) => pattern.test(canonicalLabel));
  if (profileAnswer) {
    return { decision: "answer", value: profileAnswer[1], source: "profile" };
  }

  if (sensitivePatterns.some((pattern) => pattern.test(label))) {
    return { decision: "manual", reason: "sensitive_or_legal" };
  }

  return { decision: "manual", reason: "unknown" };
}

function canonicalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
