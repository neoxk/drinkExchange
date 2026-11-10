import { ApiError } from "../lib/api";

/** Prikaže napako API-ja s podrobnostmi validacije po poljih. */
export function FieldErrors({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Napaka";
  const details = error instanceof ApiError ? error.details : undefined;
  return (
    <div className="error" role="alert">
      {message}
      {details && details.length > 0 && (
        <ul className="small">
          {details.map((d) => (
            <li key={d.path + d.message}>{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
