import { ActionForm } from "@/components/action-form";
import { Card, Field, Select } from "@/components/ui";
import { famlyConnected, listFamlyRooms } from "@/lib/famly";
import { addToFamly, getChangesFromFamly, sendChangesToFamly } from "./actions";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" });
}

function RoomSelect({ rooms, value }: { rooms: { id: string; title: string }[]; value?: string | null }) {
  return (
    <div className="min-w-60">
      <Field label="Their room in Famly">
        <Select name="room_id" required defaultValue={value ?? ""}>
          <option value="" disabled>
            Choose…
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

// Push this person to Famly, or sync later changes either way.
export async function FamlyCard({
  employee,
}: {
  employee: {
    id: string;
    famly_id: string | null;
    famly_group_id: string | null;
    famly_synced_at: string | null;
    start_date: string | null;
  };
}) {
  if (!famlyConnected()) {
    return (
      <Card title="Famly">
        <p className="text-sm text-stone-600">Famly isn&apos;t connected yet. Add the Famly API token to turn this on.</p>
      </Card>
    );
  }

  let rooms: { id: string; title: string }[] = [];
  try {
    rooms = await listFamlyRooms();
  } catch {
    return (
      <Card title="Famly">
        <p className="text-sm text-red-700">Couldn&apos;t reach Famly. Try again later.</p>
      </Card>
    );
  }

  if (employee.famly_id) {
    return (
      <Card title="Famly">
        <p className="mb-4 text-sm text-stone-600">
          Linked to Famly{employee.famly_synced_at && ` · last synced ${formatTimestamp(employee.famly_synced_at)}`}.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <ActionForm action={sendChangesToFamly.bind(null, employee.id)} submitLabel="Send changes to Famly" variant="secondary" className="flex flex-wrap items-end gap-3">
            <RoomSelect rooms={rooms} value={employee.famly_group_id} />
          </ActionForm>
          <ActionForm action={getChangesFromFamly.bind(null, employee.id)} submitLabel="Get changes from Famly" variant="secondary" className="" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Famly">
      <p className="mb-4 text-sm text-stone-600">Not in Famly yet.</p>
      {employee.start_date ? (
        <ActionForm action={addToFamly.bind(null, employee.id)} submitLabel="Add to Famly" variant="secondary" className="flex flex-wrap items-end gap-3">
          <RoomSelect rooms={rooms} />
        </ActionForm>
      ) : (
        <p className="text-sm text-amber-800">Add their start date first: Famly needs it.</p>
      )}
    </Card>
  );
}
