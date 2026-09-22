import { For } from 'solid-js';

import { SubmitButton, createForm, createScopedFields, useFieldArray } from 'solid4m';

export interface TeamMember {
  name: string;
  role: string;
}

export interface TeamRosterValues {
  members: TeamMember[];
}

const { Form } = createForm<TeamRosterValues>();

const emptyMember: TeamMember = { name: '', role: '' };

// Same constraint as FieldArray (see LineItemsForm): useFieldArray reads the
// form's context internally, so it must be rendered from a component
// *inside* `<Form>`, not from TeamRosterForm itself.
function RosterFields() {
  const [members, roster] = useFieldArray<TeamMember>('members', [
    { name: 'Ada Lovelace', role: 'Lead' },
    { name: 'Alan Turing', role: 'Engineer' },
    { name: 'Grace Hopper', role: 'Engineer' }
  ]);

  return (
    <>
      <For each={members()}>
        {(member, index) => {
          // pathAt derives this row's own base path ('members.0', 'members.1',
          // ...) from the array's name and the row's reactive index, so
          // createScopedFields never needs `members` repeated per row.
          const fields = createScopedFields<TeamMember>(roster.pathAt(index));

          return (
            <div>
              <fields.InputField name='name' label='Name' defaultValue={member.defaultValue.name} required />
              <fields.InputField name='role' label='Role' defaultValue={member.defaultValue.role} required />
              <SubmitButton
                variant='approve'
                isDisabled={index() === 0}
                onClick={() => roster.move(index(), index() - 1)}
              >
                Move up
              </SubmitButton>
              <SubmitButton
                variant='approve'
                isDisabled={index() === members().length - 1}
                onClick={() => roster.move(index(), index() + 1)}
              >
                Move down
              </SubmitButton>
              <SubmitButton variant='approve' onClick={() => roster.remove(index())}>
                Remove
              </SubmitButton>
            </div>
          );
        }}
      </For>
      <SubmitButton variant='approve' onClick={() => roster.append({ ...emptyMember })}>
        Add member
      </SubmitButton>
    </>
  );
}

export function TeamRosterForm() {
  return (
    <Form onSubmit={() => undefined}>
      <RosterFields />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
