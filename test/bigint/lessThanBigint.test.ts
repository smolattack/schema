import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe("bigint/lessThanBigint", () => {
  const schema = S.bigintFromSelf.pipe(S.lessThanBigint(0n))

  it("decoding", async () => {
    await Util.expectParseFailure(schema, 0n, "Expected a negative bigint, actual 0n")
    await Util.expectParseFailure(schema, 1n, "Expected a negative bigint, actual 1n")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
