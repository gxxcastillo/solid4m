import { type FieldArrayHelpers, FieldArray, Form, SubmitButton } from 'solid4m';

export interface LineItem {
  description: string;
  quantity: string;
}

export interface LineItemsValues {
  items: LineItem[];
}

export interface LineItemsFormProps {
  onSubmit?: (values: LineItemsValues) => void | Promise<void>;
  // Forwarded straight to <Form>, so the docs demo can exercise the documented
  // isLoading channel rather than reaching into the store behind it.
  isLoading?: boolean;
}

const emptyItem: LineItem = { description: '', quantity: '1' };

// FieldArray reads the form's context (useFormContext) internally, so it
// must be rendered from a component *inside* <Form> — not from
// LineItemsForm itself, which renders <Form> as its own child and would
// mount FieldArray before that context exists.
function LineItemFields() {
  let itemsArray!: FieldArrayHelpers<LineItem>;

  return (
    <>
      <FieldArray<LineItem> name='items' defaultValue={[emptyItem]} helpersRef={(helpers) => (itemsArray = helpers)}>
        {(fields, item, remove) => (
          <>
            <fields.InputField name='description' label='Description' defaultValue={item.description} required />
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

export function LineItemsForm(props: LineItemsFormProps) {
  return (
    // Field names inside FieldArray's children are typed against LineItem
    // per row, not against LineItemsValues as a whole — deep-path field-name
    // typing for the *form's* own onSubmit shape (items: LineItem[]) does not
    // exist yet, so onSubmit's real runtime shape ({ items: [...] }, built by
    // fieldsToProps' nested submit-value construction) has to be asserted
    // here rather than inferred.
    <Form onSubmit={(props.onSubmit ?? (() => undefined)) as (values: object) => void} isLoading={props.isLoading}>
      <LineItemFields />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
