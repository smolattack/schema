import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe("bigint/greaterThanBigint", () => {
  const schema = S.bigintFromSelf.pipe(S.greaterThanBigint(0n))

  it("decoding", async () => {
    await Util.expectParseFailure(schema, -1n, "Expected a positive bigint, actual -1n")
    await Util.expectParseFailure(schema, 0n, "Expected a positive bigint, actual 0n")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
