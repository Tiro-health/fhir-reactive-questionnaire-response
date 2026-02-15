import type { AnswerValue } from "./types.js";

export default function compare(
  answer1: AnswerValue[],
  answer2: AnswerValue[],
) {
  return JSON.stringify(answer1) === JSON.stringify(answer2);
}
