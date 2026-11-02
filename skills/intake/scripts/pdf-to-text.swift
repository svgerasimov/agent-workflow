// Текст PDF постранично через PDFKit: Read tool и греп по потокам кириллицу из ТЗ не достают.
// swift pdf-to-text.swift <in.pdf> > <out.txt>
import PDFKit

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else {
  FileHandle.standardError.write("не открылся PDF\n".data(using: .utf8)!)
  exit(1)
}
for i in 0..<doc.pageCount {
  print("=== PAGE \(i + 1)")
  print(doc.page(at: i)?.string ?? "")
}
