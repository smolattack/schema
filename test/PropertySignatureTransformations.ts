import { identity } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as Util from "@effect/schema/test/util"
import * as T from "@effect/schema/Transform"

describe.concurrent("PropertySignatureTransformations", () => {
  it("identity", async () => {
    const from = T.struct({ a: T.NumberFromString }).ast
    const to = T.struct({ a: T.number }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = []
    const schema: T.Transform<{ readonly a: string }, { readonly a: number }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
  })

  it("default", async () => {
    const from = T.struct({ a: T.optional(T.NumberFromString) }).ast
    const to = T.struct({ a: T.number }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "a",
        O.orElse(() => O.some(0)),
        identity
      )
    ]
    const schema: T.Transform<{ readonly a?: string }, { readonly a: number }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, {}, { a: 0 })
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
  })

  it("bidirectional default", async () => {
    const from = T.struct({ a: T.optional(T.NumberFromString) }).ast
    const to = T.struct({ a: T.number }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "a",
        O.orElse(() => O.some(0)),
        (o) => O.flatMap(o, O.liftPredicate((v) => v !== 0))
      )
    ]
    const schema: T.Transform<{ readonly a?: string }, { readonly a: number }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, {}, { a: 0 })
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, {})
  })

  it("optional -> Option", async () => {
    const from = T.struct({ a: T.optional(T.NumberFromString) }).ast
    const to = T.struct({ a: T.optionFromSelf(T.number) }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "a",
        O.some,
        O.flatten
      )
    ]
    const schema: T.Transform<{ readonly a?: string }, { readonly a: O.Option<number> }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, {}, { a: O.none() })
    await Util.expectParseSuccess(schema, { a: "1" }, { a: O.some(1) })
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected string -> number, actual "a"`)

    await Util.expectEncodeSuccess(schema, { a: O.some(1) }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: O.none() }, {})
  })

  it("empty string as optional", async () => {
    const from = T.struct({ a: T.string }).ast
    const to = T.struct({ a: T.optional(T.string) }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "a",
        O.flatMap(O.liftPredicate((v) => v !== "")),
        identity
      )
    ]
    const schema: T.Transform<{ readonly a: string }, { readonly a?: string }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, { a: "" }, {})
    await Util.expectParseSuccess(schema, { a: "a" }, { a: "a" })

    await Util.expectEncodeSuccess(schema, { a: "a" }, { a: "a" })
  })

  it("rename", async () => {
    const from = T.struct({ a: T.number }).ast
    const to = T.struct({ b: T.number }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "b",
        identity,
        identity
      )
    ]
    const schema: T.Transform<{ readonly a: number }, { readonly b: number }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, { a: 1 }, { b: 1 })

    await Util.expectEncodeSuccess(schema, { b: 1 }, { a: 1 })
  })

  it("reversed default", async () => {
    const from = T.struct({ a: T.number }).ast
    const to = T.struct({ a: T.optional(T.number) }).ast
    const propertySignatureTransformations: AST.Transform["propertySignatureTransformations"] = [
      AST.createPropertySignatureTransformation(
        "a",
        "a",
        identity,
        O.orElse(() => O.some(0))
      )
    ]
    const schema: T.Transform<{ readonly a: string }, { readonly a?: number }> = T.make(
      AST.createTransformByPropertySignatureTransformations(
        from,
        to,
        propertySignatureTransformations
      )
    )
    await Util.expectParseSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectParseSuccess(schema, { a: 0 }, { a: 0 })

    await Util.expectEncodeSuccess(schema, {}, { a: 0 })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
  })
})
