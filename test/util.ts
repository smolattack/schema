import * as Duration from "@effect/data/Duration"
import * as Either from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as RA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as A from "@effect/schema/Arbitrary"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import type { Codec } from "@effect/schema/Codec"
import * as C from "@effect/schema/Codec"
import { getDecode } from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { formatActual, formatErrors, formatExpected } from "@effect/schema/TreeFormatter"
import * as fc from "fast-check"

// const doEffectify = true
// const doRoundtrip = true
// TODO
const doEffectify = false
const doRoundtrip = false

export const sleep = Effect.sleep(Duration.millis(10))

export const effectifyDecode = (
  decode: (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any>,
  override: AST.AST
): (input: any, options: ParseOptions, self: AST.AST) => PR.ParseResult<any> =>
  (input, options) => PR.flatMap(sleep, () => decode(input, options, override))

let skip = false

const effectifyAST = (ast: AST.AST, mode: "all" | "semi"): AST.AST => {
  if (mode === "semi") {
    skip = !skip
    if (!skip) {
      return ast
    }
  }
  switch (ast._tag) {
    case "Tuple":
      return AST.createTuple(
        ast.elements.map((e) => AST.createElement(effectifyAST(e.type, mode), e.isOptional)),
        O.map(ast.rest, RA.mapNonEmpty((ast) => effectifyAST(ast, mode))),
        ast.isReadonly,
        ast.annotations
      )
    case "TypeLiteral":
      return AST.createTypeLiteral(
        ast.propertySignatures.map((p) => ({ ...p, type: effectifyAST(p.type, mode) })),
        ast.indexSignatures.map((is) =>
          AST.createIndexSignature(is.parameter, effectifyAST(is.type, mode), is.isReadonly)
        ),
        ast.annotations
      )
    case "Union":
      return AST.createUnion(ast.types.map((ast) => effectifyAST(ast, mode)), ast.annotations)
    case "Lazy":
      return AST.createLazy(() => effectifyAST(ast.f(), mode), ast.annotations)
    case "Refinement":
      return AST.createRefinement(
        effectifyAST(ast.from, mode),
        ast.filter,
        ast.annotations
      )
    case "Transform":
      return AST.createTransform(
        effectifyAST(ast.from, mode),
        effectifyAST(ast.to, mode),
        AST.createFinalTransformation(
          // I need to override with the original ast here in order to not change the error message
          // ------------------------------------------------v
          effectifyDecode(getDecode(ast.transformAST, true), ast),
          // I need to override with the original ast here in order to not change the error message
          // ------------------------------------------------v
          effectifyDecode(getDecode(ast.transformAST, false), ast)
        ),
        ast.annotations
      )
  }
  const decode = C.decode(C.make(ast))
  return AST.createTransform(
    ast,
    ast,
    AST.createFinalTransformation(
      (a, options) => Effect.flatMap(sleep, () => decode(a, options)),
      (a, options) => Effect.flatMap(sleep, () => decode(a, options))
    )
  )
}

export const effectify = <I, A>(schema: Codec<I, A>, mode: "all" | "semi"): Codec<I, A> =>
  C.make(effectifyAST(schema.ast, mode))

  export const roundtrip = <I, A>(codec: Codec<I, A>) => {
    if (!doRoundtrip) {
      return
    }
    const to = C.to(codec)
    const arb = A.build(to)
    const is = S.is(to)
    const encode = C.encode(codec)
    const decode = C.decode(codec)
    fc.assert(fc.property(arb(fc), (a) => {
      const roundtrip = encode(a).pipe(
        Effect.mapError(() => "encoding" as const),
        Effect.flatMap((i) => decode(i).pipe(Effect.mapError(() => "decoding" as const))),
        Effect.either,
        Effect.runSync
      )
      if (Either.isLeft(roundtrip)) {
        return roundtrip.left === "encoding"
      }
      return is(roundtrip.right)
    }))
    if (doEffectify) {
      const effectCodec = effectify(codec, "all")
      const encode = C.encode(effectCodec)
      const decode = C.decode(effectCodec)
      fc.assert(fc.asyncProperty(arb(fc), async (a) => {
        const roundtrip = await encode(a).pipe(
          Effect.mapError(() => "encoding" as const),
          Effect.flatMap((i) => decode(i).pipe(Effect.mapError(() => "decoding" as const))),
          Effect.either,
          Effect.runPromise
        )
        if (Either.isLeft(roundtrip)) {
          return roundtrip.left === "encoding"
        }
        return is(roundtrip.right)
      }))
    }
  }

export const onExcessPropertyError: ParseOptions = {
  onExcessProperty: "error"
}

export const allErrors: ParseOptions = {
  errors: "all"
}

export const expectParseSuccess = async <I, A>(
  schema: Codec<I, A>,
  input: unknown,
  expected: A = input as any,
  options?: ParseOptions
) => {
  const actual = Effect.runSync(Effect.either(C.parse(schema)(input, options)))
  expect(actual).toStrictEqual(Either.right(expected))
  if (doEffectify) {
    const parseEffectResult = await Effect.runPromise(
      Effect.either(C.parse(effectify(schema, "all"))(input, options))
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = await Effect.runPromise(
      Effect.either(C.parse(effectify(schema, "semi"))(input, options))
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectParseFailure = async <I, A>(
  schema: Codec<I, A>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(C.parse(schema)(input, options))),
    (e) => formatAll(e.errors)
  )
  expect(actual).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const parseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.parse(effectify(schema, "all"))(input, options))),
      (e) => formatAll(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.parse(effectify(schema, "semi"))(input, options))),
      (e) => formatAll(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectParseFailureTree = async <I, A>(
  schema: Codec<I, A>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(C.parse(schema)(input, options))),
    (e) => formatErrors(e.errors)
  )
  expect(actual).toEqual(Either.left(message))
  if (doEffectify) {
    const parseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.parse(effectify(schema, "all"))(input, options))),
      (e) => formatErrors(e.errors)
    )
    expect(parseEffectResult).toStrictEqual(actual)
    const semiParseEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.parse(effectify(schema, "semi"))(input, options))),
      (e) => formatErrors(e.errors)
    )
    expect(semiParseEffectResult).toStrictEqual(actual)
  }
}

export const expectEncodeSuccess = async <I, A>(
  schema: Codec<I, A>,
  a: A,
  expected: unknown,
  options?: ParseOptions
) => {
  const actual = Effect.runSync(Effect.either(C.encode(schema)(a, options)))
  expect(actual).toStrictEqual(Either.right(expected))
  if (doEffectify) {
    const allencodeEffectResult = await Effect.runPromise(
      Effect.either(C.encode(effectify(schema, "all"))(a, options))
    )
    expect(allencodeEffectResult).toStrictEqual(actual)
    const semiEncodeEffectResult = await Effect.runPromise(
      Effect.either(C.encode(effectify(schema, "semi"))(a, options))
    )
    expect(semiEncodeEffectResult).toStrictEqual(actual)
  }
}

export const expectEncodeFailure = async <I, A>(
  schema: Codec<I, A>,
  a: A,
  message: string,
  options?: ParseOptions
) => {
  const actual = Either.mapLeft(
    Effect.runSync(Effect.either(C.encode(schema)(a, options))),
    (e) => formatAll(e.errors)
  )
  expect(actual).toStrictEqual(Either.left(message))
  if (doEffectify) {
    const encodeEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.encode(effectify(schema, "all"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(encodeEffectResult).toStrictEqual(actual)
    const randomEncodeEffectResult = Either.mapLeft(
      await Effect.runPromise(Effect.either(C.encode(effectify(schema, "semi"))(a, options))),
      (e) => formatAll(e.errors)
    )
    expect(randomEncodeEffectResult).toStrictEqual(actual)
  }
}

export const formatAll = (errors: NonEmptyReadonlyArray<PR.ParseErrors>): string =>
  pipe(errors, RA.map(formatDecodeError), RA.join(", "))

const getMessage = AST.getAnnotation<AST.MessageAnnotation<unknown>>(AST.MessageAnnotationId)

const formatDecodeError = (e: PR.ParseErrors): string => {
  switch (e._tag) {
    case "Type":
      return pipe(
        getMessage(e.expected),
        O.map((f) => f(e.actual)),
        O.orElse(() => e.message),
        O.getOrElse(() =>
          `Expected ${formatExpected(e.expected)}, actual ${formatActual(e.actual)}`
        )
      )
    case "Forbidden":
      return "is forbidden"
    case "Index":
      return `/${e.index} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Key":
      return `/${String(e.key)} ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
    case "Missing":
      return `is missing`
    case "Unexpected":
      return `is unexpected`
    case "UnionMember":
      return `union member: ${pipe(e.errors, RA.map(formatDecodeError), RA.join(", "))}`
  }
}

export const printAST = <I, A>(codec: Codec<I, A>) => {
  console.log("%o", codec.ast)
}

export const identityTransform = <A>(schema: S.Schema<A>): C.Codec<A, A> =>
  schema.pipe(C.compose(schema))

export const X2 = C.transform(
  S.string,
  S.string,
  (s) => s + s,
  (s) => s.substring(0, s.length / 2)
)

export const X3 = C.transform(
  S.string,
  S.string,
  (s) => s + s + s,
  (s) => s.substring(0, s.length / 3)
)
