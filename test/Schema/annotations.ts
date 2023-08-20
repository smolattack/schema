import { ArbitraryHookId } from "@effect/schema/Arbitrary"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("annotations", () => {
  it("on filter", () => {
    const schema = S.string.pipe(
      S.filter((s): s is string => s.length === 1, {
        typeId: Symbol.for("Char"),
        description: "description",
        documentation: "documentation",
        examples: ["examples"],
        identifier: "identifier",
        jsonSchema: { minLength: 1, maxLength: 1 },
        title: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    )
    expect(schema.ast.annotations).toEqual({
      [AST.TypeAnnotationId]: Symbol.for("Char"),
      [AST.DescriptionAnnotationId]: "description",
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.ExamplesAnnotationId]: [
        "examples"
      ],
      [AST.IdentifierAnnotationId]: "identifier",
      [AST.JSONSchemaAnnotationId]: {
        "maxLength": 1,
        "minLength": 1
      },
      [AST.TitleAnnotationId]: "title",
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("toAnnotation (message)", () => {
    const schema = S.string.pipe(
      S.filter((s): s is string => s.length === 1, {
        message: () => "message"
      })
    )
    const annotation: any = schema.ast.annotations[AST.MessageAnnotationId]
    expect(annotation).toBeTypeOf("function")
    expect(annotation()).toEqual("message")
  })

  it("toAnnotation (arbitrary)", () => {
    const schema = S.string.pipe(
      S.filter((s): s is string => s.length === 1, {
        arbitrary: () => (fc) => fc.string({ minLength: 1, maxLength: 1 })
      })
    )
    expect(schema.ast.annotations[ArbitraryHookId]).exist
  })
})