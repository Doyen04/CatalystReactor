
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}
