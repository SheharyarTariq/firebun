/**
 * Browser transport: loads the receipt page in a hidden iframe that prints itself
 * (`?print=1` adds `window.print()` on load). Works with any printer the phone or PC
 * can see in its print dialog, including RawBT installed as a print service.
 */
export function printViaBrowser(url: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.src = url;
  document.body.appendChild(frame);
  // The dialog blocks the page; remove the frame once it is dismissed (or after a while).
  const cleanup = () => frame.remove();
  frame.addEventListener("load", () => {
    frame.contentWindow?.addEventListener("afterprint", cleanup);
  });
  setTimeout(cleanup, 120_000);
}
