import fhirpath from "fhirpath";
import r4model from "fhirpath/fhir-context/r4";

export function evaluateFhirPath(
  expression: string,
  resource: { resourceType: string },
): unknown[] {
  return fhirpath.evaluate(
    resource,
    expression,
    { resource },
    r4model,
  ) as unknown[];
}
