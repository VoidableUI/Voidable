export function App({ onMenu }: { onMenu: () => void }) {
  return (
    <>
      <void-popover position="bottom">
        <void-popover-trigger><button type="button">Info</button></void-popover-trigger>
        <void-popover-content><p>More.</p></void-popover-content>
      </void-popover>
      <void-hamburger aria-label="Menu" onvoid-toggle={onMenu}></void-hamburger>
      <void-dialog closable="false"><void-dialog-title>Sure?</void-dialog-title></void-dialog>
      <void-carousel aria-label="Slides" active={2}><void-carousel-content><void-carousel-item>1</void-carousel-item></void-carousel-content></void-carousel>
      <void-bar-chart aria-label="Revenue" show-values></void-bar-chart>
    </>
  );
}
