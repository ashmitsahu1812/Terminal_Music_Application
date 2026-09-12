declare module 'neo-blessed' {
  import blessed from 'blessed';
  export = blessed;
}

declare module 'blessed-contrib' {
  export const grid: any;
  export const line: any;
  export const bar: any;
  export const table: any;
  export const tree: any;
  export const gauge: any;
  export const donut: any;
  export const lcd: any;
  export const log: any;
  export const map: any;
  export const picture: any;
  export const markdown: any;
}
