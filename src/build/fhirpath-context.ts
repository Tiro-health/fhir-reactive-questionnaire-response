import fhirpath from "fhirpath";
import r5model from "fhirpath/fhir-context/r5";

export function evaluateFhirPath(
  expression: string,
  resource: { resourceType: string },
): unknown[] {
  return fhirpath.evaluate(
    resource,
    expression,
    { resource },
    r5model,
  ) as unknown[];
}
