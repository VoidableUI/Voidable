export function App({ plan, rest }: Props) {
  return (
    <div className="app">
      <void-sidebar className="nav" collapsedWidth="4rem" onvoid-toggle={(e) => setOpen(e.detail.collapsed)}>
        <void-button variant={"primary"} onvoid-change={save} {...rest}>Save</void-button>
      </void-sidebar>
      <void-input value={plan} placeholder={`Plan ${plan}`} />
    </div>
  );
}
