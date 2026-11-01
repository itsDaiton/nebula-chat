// The mockup's rows: secondary text that brightens on the selected row, muted icons, quiet group headings.
export const itemClass =
  'h-9 gap-2.5 px-2 text-[13.5px] text-foreground-secondary data-[selected=true]:text-foreground [&_svg]:text-muted-foreground [&>svg:last-child]:hidden';

export const groupClass =
  'p-0 text-foreground-secondary **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:text-faint';

// Key hints carry a border; Kbd's own fill matches the popover and would vanish.
export const kbdClass = 'border border-border-strong bg-raised';
