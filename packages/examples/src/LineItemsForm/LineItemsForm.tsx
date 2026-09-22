import { FieldArray, type FieldArrayHelpers, SubmitButton, createForm } from 'solid4m';

export interface LineItem {
  description: string;
  quantity: string;
}

export interface LineItemsValues {
  items: LineItem[];
}

export interface LineItemsFormProps {
  onSubmit?: (values: LineItemsValues) => void | Promise<void>;
  // Forwarded straight to `<Form>`, so this demo exercises the documented
  // `isLoading` channel instead of reaching into the store behind it.
  isLoading?: boolean;
}

const emptyItem: LineItem = { description: '', quantity: '1' };

// FieldArray reads the form's context (useFormContext) internally, so it
// must be rendered from a component *inside* `<Form>` — not from
// LineItemsForm itself, which renders `<Form>` as its own child and would
// mount FieldArray before that context exists.
function LineItemFields() {
  let itemsArray!: FieldArrayHelpers<LineItem>;

  return (
    <>
      <FieldArray<LineItem>
        name='items'
        defaultValue={[emptyItem]}
        helpersRef={(helpers) => (itemsArray = helpers)}
      >
        {(fields, item, remove) => (
          <>
            <fields.InputField
              name='description'
              label='Description'
              defaultValue={item.description}
              required
            />
            <fields.InputField name='quantity' label='Quantity' defaultValue={item.quantity} required />
            <SubmitButton variant='approve' onClick={remove}>
              Remove
            </SubmitButton>
          </>
        )}
      </FieldArray>
      <SubmitButton variant='approve' onClick={() => itemsArray.append({ ...emptyItem })}>
        Add line item
      </SubmitButton>
    </>
  );
}

const { Form } = createForm<LineItemsValues>();

export function LineItemsForm(props: LineItemsFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)} isLoading={props.isLoading}>
      <LineItemFields />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
