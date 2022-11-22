import * as A from "@fp-ts/codec/Arbitrary"
import * as C from "@fp-ts/codec/data/Chunk"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as JD from "@fp-ts/codec/JsonDecoder"
import * as S from "@fp-ts/codec/Schema"
import * as Sh from "@fp-ts/codec/Show"
import * as DC from "@fp-ts/data/Chunk"
import * as fc from "fast-check"

describe("Chunk", () => {
  it("id", () => {
    expect(C.id).exist
  })

  it("Provider", () => {
    expect(C.Provider).exist
  })

  it("guard", () => {
    const schema = C.schema(S.string)
    const guard = G.unsafeGuardFor(schema)
    expect(guard.is(DC.empty)).toEqual(true)
    expect(guard.is(DC.unsafeFromArray(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(DC.unsafeFromArray(["a", "b", 1]))).toEqual(false)
  })

  it("decoder", () => {
    const schema = C.schema(S.number)
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.succeed(DC.empty))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.succeed(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(decoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, DC.unsafeFromArray([1, NaN, 3]))
    )
    expect(decoder.decode(null)).toEqual(
      D.fail(DE.notType("ReadonlyArray<unknown>", null))
    )
    expect(decoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("jsonDecoder", () => {
    const schema = C.schema(S.number)
    const jsonDecoder = JD.unsafeJsonDecoderFor(schema)
    expect(jsonDecoder.decode([])).toEqual(D.succeed(DC.empty))
    expect(jsonDecoder.decode([1, 2, 3])).toEqual(
      D.succeed(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(jsonDecoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, DC.unsafeFromArray([1, NaN, 3]))
    )
    expect(jsonDecoder.decode(null)).toEqual(
      D.fail(DE.notType("ReadonlyArray<unknown>", null))
    )
    expect(jsonDecoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("show", () => {
    const schema = C.schema(S.number)
    const show = Sh.unsafeShowFor(schema)
    expect(show.show(DC.empty)).toEqual("chunk.unsafeFromArray([])")
    expect(show.show(DC.unsafeFromArray([1, 2, 3]))).toEqual("chunk.unsafeFromArray([1, 2, 3])")
  })

  it("arbitrary", () => {
    const schema = C.schema(S.number)
    const arbitrary = A.unsafeArbitraryFor(schema)
    const guard = G.unsafeGuardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), 10).every(guard.is)).toEqual(true)
  })
})