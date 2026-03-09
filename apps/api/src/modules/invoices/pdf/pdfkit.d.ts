declare module 'pdfkit' {
  export default class PDFDocument {
    constructor(options?: Record<string, unknown>);
    on(event: string, callback: (...args: any[]) => void): this;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    end(): void;
    y: number;
  }
}
