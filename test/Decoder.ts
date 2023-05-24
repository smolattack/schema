import { pipe } from "@effect/data/Function"
import * as Util from "@effect/schema/test/util"
import * as T from "@effect/schema/Transform"

describe.concurrent("Decoder", () => {
  it("from", async () => {
    const schema = T.from(T.NumberFromString)
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseFailure(schema, null, "Expected string, actual null")
    await Util.expectParseFailure(schema, 1, "Expected string, actual 1")
  })

  it("to", async () => {
    const schema = T.to(T.NumberFromString)
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(schema, null, "Expected number, actual null")
    await Util.expectParseFailure(schema, "a", `Expected number, actual "a"`)
  })

  it("annotations/message refinement", async () => {
    const schema = pipe(
      // initial schema, a string
      T.string,
      // add an error message for non-string values
      T.message(() => "not a string"),
      // add a constraint to the schema, only non-empty strings are valid
      T.nonEmpty({ message: () => "required" }),
      // add a constraint to the schema, only strings with a length less or equal than 10 are valid
      T.maxLength(10, { message: (s) => `${s} is too long` })
    )

    await Util.expectParseFailure(schema, null, "not a string")
    await Util.expectParseFailure(schema, "", "required")
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseFailure(schema, "aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa is too long")
  })

  it("void", async () => {
    const schema = T.void
    await Util.expectParseSuccess(schema, undefined, undefined)
    await Util.expectParseFailure(schema, 1, `Expected void, actual 1`)
  })

  it("any", async () => {
    const schema = T.any
    await Util.expectParseSuccess(schema, undefined, undefined)
    await Util.expectParseSuccess(schema, null, null)
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseSuccess(schema, 1, 1)
    await Util.expectParseSuccess(schema, true, true)
    await Util.expectParseSuccess(schema, [], [])
    await Util.expectParseSuccess(schema, {}, {})
  })

  it("unknown", async () => {
    const schema = T.unknown
    await Util.expectParseSuccess(schema, undefined, undefined)
    await Util.expectParseSuccess(schema, null, null)
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseSuccess(schema, 1, 1)
    await Util.expectParseSuccess(schema, true, true)
    await Util.expectParseSuccess(schema, [], [])
    await Util.expectParseSuccess(schema, {}, {})
  })

  it("never", async () => {
    const schema = T.never
    await Util.expectParseFailure(schema, 1, "Expected never, actual 1")
  })

  it("string", async () => {
    const schema = T.string
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseFailure(schema, 1, "Expected string, actual 1")
  })

  it("number", async () => {
    const schema = T.number
    await Util.expectParseSuccess(schema, 1, 1)
    await Util.expectParseSuccess(schema, NaN, NaN)
    await Util.expectParseSuccess(schema, Infinity, Infinity)
    await Util.expectParseSuccess(schema, -Infinity, -Infinity)
    await Util.expectParseFailure(schema, "a", `Expected number, actual "a"`)
  })

  it("boolean", async () => {
    const schema = T.boolean
    await Util.expectParseSuccess(schema, true, true)
    await Util.expectParseSuccess(schema, false, false)
    await Util.expectParseFailure(schema, 1, `Expected boolean, actual 1`)
  })

  it("bigint", async () => {
    const schema = T.bigint
    await Util.expectParseSuccess(schema, 0n, 0n)
    await Util.expectParseSuccess(schema, 1n, 1n)

    await Util.expectParseFailure(
      schema,
      null,
      "Expected bigint, actual null"
    )
    await Util.expectParseFailure(
      schema,
      1.2,
      `Expected bigint, actual 1.2`
    )
  })

  it("symbol", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = T.symbol
    await Util.expectParseSuccess(schema, a)
    await Util.expectParseFailure(
      schema,
      "@effect/schema/test/a",
      `Expected symbol, actual "@effect/schema/test/a"`
    )
  })

  it("object", async () => {
    const schema = T.object
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseFailure(schema, null, `Expected object, actual null`)
    await Util.expectParseFailure(schema, "a", `Expected object, actual "a"`)
    await Util.expectParseFailure(schema, 1, `Expected object, actual 1`)
    await Util.expectParseFailure(schema, true, `Expected object, actual true`)
  })

  it("literal 1 member", async () => {
    const schema = T.literal(1)
    await Util.expectParseSuccess(schema, 1)

    await Util.expectParseFailure(schema, "a", `Expected 1, actual "a"`)
    await Util.expectParseFailure(schema, null, `Expected 1, actual null`)
  })

  it("literal 2 members", async () => {
    const schema = T.literal(1, "a")
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseSuccess(schema, "a")

    await Util.expectParseFailureTree(
      schema,
      null,
      `error(s) found
├─ union member
│  └─ Expected 1, actual null
└─ union member
   └─ Expected "a", actual null`
    )
  })

  it("uniqueSymbol", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = T.uniqueSymbol(a)
    await Util.expectParseSuccess(schema, a)
    await Util.expectParseSuccess(schema, Symbol.for("@effect/schema/test/a"))
    await Util.expectParseFailure(
      schema,
      "Symbol(@effect/schema/test/a)",
      `Expected Symbol(@effect/schema/test/a), actual "Symbol(@effect/schema/test/a)"`
    )
  })

  it("Numeric enums", async () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = T.enums(Fruits)
    await Util.expectParseSuccess(schema, Fruits.Apple)
    await Util.expectParseSuccess(schema, Fruits.Banana)
    await Util.expectParseSuccess(schema, 0)
    await Util.expectParseSuccess(schema, 1)

    await Util.expectParseFailure(
      schema,
      3,
      `Expected 0 | 1, actual 3`
    )
  })

  it("String enums", async () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = T.enums(Fruits)
    await Util.expectParseSuccess(schema, Fruits.Apple)
    await Util.expectParseSuccess(schema, Fruits.Cantaloupe)
    await Util.expectParseSuccess(schema, "apple")
    await Util.expectParseSuccess(schema, "banana")
    await Util.expectParseSuccess(schema, 0)

    await Util.expectParseFailure(
      schema,
      "Cantaloupe",
      `Expected 0 | 1 | 2, actual "Cantaloupe"`
    )
  })

  it("Const enums", async () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = T.enums(Fruits)
    await Util.expectParseSuccess(schema, "apple")
    await Util.expectParseSuccess(schema, "banana")
    await Util.expectParseSuccess(schema, 3)

    await Util.expectParseFailure(
      schema,
      "Cantaloupe",
      `Expected 0 | 1 | 2, actual "Cantaloupe"`
    )
  })

  it("brand/ decoding", async () => {
    const schema = pipe(T.string, T.numberFromString, T.int(), T.brand("Int"))
    await Util.expectParseSuccess(schema, "1", 1 as any)
    await Util.expectParseFailure(
      schema,
      null,
      `Expected string, actual null`
    )
  })

  it("brand/symbol decoding", async () => {
    const Int = Symbol.for("Int")
    const schema = pipe(T.string, T.numberFromString, T.int(), T.brand(Int))
    await Util.expectParseSuccess(schema, "1", 1 as any)
    await Util.expectParseFailure(
      schema,
      null,
      `Expected string, actual null`
    )
  })

  it("tuple. empty", async () => {
    const schema = T.tuple()
    await Util.expectParseSuccess(schema, [])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(
      schema,
      {},
      `Expected a generic array, actual {}`
    )
    await Util.expectParseFailure(schema, [undefined], `/0 is unexpected`)
    await Util.expectParseFailure(schema, [1], `/0 is unexpected`)
  })

  it("tuple. required element", async () => {
    const schema = T.tuple(T.number)
    await Util.expectParseSuccess(schema, [1])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(schema, [], `/0 is missing`)
    await Util.expectParseFailure(
      schema,
      [undefined],
      `/0 Expected number, actual undefined`
    )
    await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. required element with undefined", async () => {
    const schema = T.tuple(T.union(T.number, T.undefined))
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [undefined])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(schema, [], `/0 is missing`)
    await Util.expectParseFailure(
      schema,
      ["a"],
      `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element", async () => {
    const schema = pipe(T.tuple(), T.optionalElement(T.number))
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, [1])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(
      schema,
      ["a"],
      `/0 Expected number, actual "a"`
    )
    await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element with undefined", async () => {
    const schema = pipe(T.tuple(), T.optionalElement(T.union(T.number, T.undefined)))
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [undefined])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(
      schema,
      ["a"],
      `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. e e?", async () => {
    const schema = pipe(T.tuple(T.string), T.optionalElement(T.number))
    await Util.expectParseSuccess(schema, ["a"])
    await Util.expectParseSuccess(schema, ["a", 1])

    await Util.expectParseFailure(schema, [1], `/0 Expected string, actual 1`)
    await Util.expectParseFailure(schema, ["a", "b"], `/1 Expected number, actual "b"`)
  })

  it("tuple. e r", async () => {
    const schema = pipe(T.tuple(T.string), T.rest(T.number))
    await Util.expectParseSuccess(schema, ["a"])
    await Util.expectParseSuccess(schema, ["a", 1])
    await Util.expectParseSuccess(schema, ["a", 1, 2])

    await Util.expectParseFailure(schema, [], `/0 is missing`)
  })

  it("tuple. e? r", async () => {
    const schema = pipe(T.tuple(), T.optionalElement(T.string), T.rest(T.number))
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, ["a"])
    await Util.expectParseSuccess(schema, ["a", 1])
    await Util.expectParseSuccess(schema, ["a", 1, 2])

    await Util.expectParseFailure(schema, [1], `/0 Expected string, actual 1`)
  })

  it("tuple. r", async () => {
    const schema = T.array(T.number)
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [1, 2])

    await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    await Util.expectParseFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("tuple. r e", async () => {
    const schema = pipe(T.array(T.string), T.element(T.number))
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, ["a", 1])
    await Util.expectParseSuccess(schema, ["a", "b", 1])

    await Util.expectParseFailure(schema, [], `/0 is missing`)
    await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    await Util.expectParseFailure(schema, [1, 2], `/0 Expected string, actual 1`)
  })

  it("tuple. e r e", async () => {
    const schema = pipe(T.tuple(T.string), T.rest(T.number), T.element(T.boolean))
    await Util.expectParseSuccess(schema, ["a", true])
    await Util.expectParseSuccess(schema, ["a", 1, true])
    await Util.expectParseSuccess(schema, ["a", 1, 2, true])

    await Util.expectParseFailure(schema, [], `/0 is missing`)
    await Util.expectParseFailure(schema, ["a"], `/1 is missing`)
    await Util.expectParseFailure(schema, ["a", 1], `/1 Expected boolean, actual 1`)
    await Util.expectParseFailure(schema, [1, true], `/0 Expected string, actual 1`)
    await Util.expectParseFailure(schema, [true], `/1 is missing`)
  })

  it("struct/ empty", async () => {
    const schema = T.struct({})
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })
    await Util.expectParseSuccess(schema, [])

    await Util.expectParseFailure(
      schema,
      null,
      `Expected <anonymous type literal schema>, actual null`
    )
  })

  it("struct/ required property signature", async () => {
    const schema = T.struct({ a: T.number })
    await Util.expectParseSuccess(schema, { a: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic object, actual null`
    )
    await Util.expectParseFailure(schema, {}, "/a is missing")
    await Util.expectParseFailure(
      schema,
      { a: undefined },
      "/a Expected number, actual undefined"
    )
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      "/b is unexpected",
      Util.onExcessPropertyError
    )
  })

  it("struct/ required property signature with undefined", async () => {
    const schema = T.struct({ a: T.union(T.number, T.undefined) })
    await Util.expectParseSuccess(schema, { a: 1 })
    await Util.expectParseSuccess(schema, { a: undefined })

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic object, actual null`
    )
    await Util.expectParseFailure(schema, {}, "/a is missing")
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      "/b is unexpected",
      Util.onExcessPropertyError
    )
  })

  it("struct/ optional property signature", async () => {
    const schema = T.struct({ a: T.optional(T.number) })
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic object, actual null`
    )
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `/a Expected number, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { a: undefined },
      `/a Expected number, actual undefined`
    )
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      "/b is unexpected",
      Util.onExcessPropertyError
    )
  })

  it("struct/ optional property signature with undefined", async () => {
    const schema = T.struct({ a: T.optional(T.union(T.number, T.undefined)) })
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })
    await Util.expectParseSuccess(schema, { a: undefined })

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic object, actual null`
    )
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      "/b is unexpected",
      Util.onExcessPropertyError
    )
  })

  it("struct/ should not add optional keys", async () => {
    const schema = T.struct({ a: T.optional(T.string), b: T.optional(T.number) })
    await Util.expectParseSuccess(schema, {})
  })

  it("struct/ record(never, number)", async () => {
    const schema = T.record(T.never, T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })
  })

  it("struct/ record(string, number)", async () => {
    const schema = T.record(T.string, T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })

    await Util.expectParseFailure(
      schema,
      [],
      "Expected a generic object, actual []"
    )
    await Util.expectParseFailure(
      schema,
      { a: "a" },
      `/a Expected number, actual "a"`
    )
    const b = Symbol.for("@effect/schema/test/b")
    await Util.expectParseFailure(
      schema,
      { a: 1, [b]: "b" },
      "/Symbol(@effect/schema/test/b) is unexpected",
      Util.onExcessPropertyError
    )
    await Util.expectParseSuccess(
      schema,
      { a: 1, [b]: "b" },
      { a: 1 }
    )
  })

  it("struct/ record(symbol, number)", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = T.record(T.symbol, T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { [a]: 1 })

    await Util.expectParseFailure(
      schema,
      [],
      "Expected a generic object, actual []"
    )
    await Util.expectParseFailure(
      schema,
      { [a]: "a" },
      `/Symbol(@effect/schema/test/a) Expected number, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      { [a]: 1, b: "b" },
      "/b is unexpected",
      Util.onExcessPropertyError
    )
    await Util.expectParseSuccess(
      schema,
      { [a]: 1, b: "b" },
      { [a]: 1 }
    )
  })

  it("struct/ record(never, number)", async () => {
    const schema = T.record(T.never, T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })
  })

  it("struct/ record('a' | 'b', number)", async () => {
    const schema = T.record(T.union(T.literal("a"), T.literal("b")), T.number)
    await Util.expectParseSuccess(schema, { a: 1, b: 2 })

    await Util.expectParseFailure(schema, {}, `/a is missing`)
    await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
    await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
  })

  it("struct/ record(keyof struct({ a, b }), number)", async () => {
    const schema = T.record(T.keyof(T.struct({ a: T.string, b: T.string })), T.number)
    await Util.expectParseSuccess(schema, { a: 1, b: 2 })

    await Util.expectParseFailure(schema, {}, `/a is missing`)
    await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
    await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
  })

  it("struct/ record(keyof struct({ a, b } & Record<string, string>), number)", async () => {
    const schema = T.record(
      T.keyof(pipe(T.struct({ a: T.string, b: T.string }), T.extend(T.record(T.string, T.string)))),
      T.number
    )
    await Util.expectParseSuccess(schema, { a: 1, b: 2 })
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })
    await Util.expectParseSuccess(schema, { b: 2 })

    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
  })

  it("struct/ record(keyof struct({ a, b } & Record<symbol, string>), number)", async () => {
    const schema = T.record(
      T.keyof(pipe(T.struct({ a: T.string, b: T.string }), T.extend(T.record(T.symbol, T.string)))),
      T.number
    )
    await Util.expectParseSuccess(schema, { a: 1, b: 2 })
    const c = Symbol.for("@effect/schema/test/c")
    await Util.expectParseSuccess(schema, { a: 1, b: 2, [c]: 3 })

    await Util.expectParseFailure(schema, {}, `/a is missing`)
    await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
    await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
    await Util.expectParseFailure(
      schema,
      { a: 1, b: 2, [c]: "c" },
      `/Symbol(@effect/schema/test/c) Expected number, actual "c"`
    )
    await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
  })

  it("struct/ record(Symbol('a') | Symbol('b'), number)", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = T.record(T.union(T.uniqueSymbol(a), T.uniqueSymbol(b)), T.number)
    await Util.expectParseSuccess(schema, { [a]: 1, [b]: 2 })

    await Util.expectParseFailure(schema, {}, `/Symbol(@effect/schema/test/a) is missing`)
    await Util.expectParseFailure(
      schema,
      { [a]: 1 },
      `/Symbol(@effect/schema/test/b) is missing`
    )
    await Util.expectParseFailure(
      schema,
      { [b]: 2 },
      `/Symbol(@effect/schema/test/a) is missing`
    )
  })

  it("struct/ record(${string}-${string}, number)", async () => {
    const schema = T.record(T.templateLiteral(T.string, T.literal("-"), T.string), T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { "-": 1 })
    await Util.expectParseSuccess(schema, { "a-": 1 })
    await Util.expectParseSuccess(schema, { "-b": 1 })
    await Util.expectParseSuccess(schema, { "a-b": 1 })

    await Util.expectParseFailure(
      schema,
      { "": 1 },
      "/ Expected ${string}-${string}, actual \"\""
    )
    await Util.expectParseFailure(
      schema,
      { "-": "a" },
      `/- Expected number, actual "a"`
    )
  })

  it("struct/ record(minLength(1), number)", async () => {
    const schema = T.record(pipe(T.string, T.minLength(2)), T.number)
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { "aa": 1 })
    await Util.expectParseSuccess(schema, { "aaa": 1 })

    await Util.expectParseFailure(
      schema,
      { "": 1 },
      `/ Expected a string at least 2 character(s) long, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      { "a": 1 },
      `/a Expected a string at least 2 character(s) long, actual "a"`
    )
  })

  it("union/ empty union", async () => {
    const schema = T.union()
    await Util.expectParseFailure(schema, 1, "Expected never, actual 1")
  })

  it("union/ members with literals but the input doesn't have any", async () => {
    const schema = T.union(
      T.struct({ a: T.literal(1), c: T.string }),
      T.struct({ b: T.literal(2), d: T.number })
    )
    await Util.expectParseFailure(
      schema,
      null,
      "Expected a generic object, actual null"
    )
    await Util.expectParseFailure(schema, {}, "/a is missing, /b is missing")
    await Util.expectParseFailure(
      schema,
      { a: null },
      `/a Expected 1, actual null, /b is missing`
    )
    await Util.expectParseFailure(schema, { b: 3 }, `/a is missing, /b Expected 2, actual 3`)
  })

  it("union/ members with multiple tags", async () => {
    const schema = T.union(
      T.struct({ category: T.literal("catA"), tag: T.literal("a") }),
      T.struct({ category: T.literal("catA"), tag: T.literal("b") }),
      T.struct({ category: T.literal("catA"), tag: T.literal("c") })
    )
    await Util.expectParseFailure(
      schema,
      null,
      "Expected a generic object, actual null"
    )
    await Util.expectParseFailure(schema, {}, "/category is missing, /tag is missing")
    await Util.expectParseFailure(
      schema,
      { category: null },
      `/category Expected "catA", actual null, /tag is missing`
    )
    await Util.expectParseFailure(
      schema,
      { tag: "d" },
      `/category is missing, /tag Expected "b" or "c", actual "d"`
    )
  })

  it("union/required property signatures: should return the best output", async () => {
    const a = T.struct({ a: T.string })
    const ab = T.struct({ a: T.string, b: T.number })
    const schema = T.union(a, ab)
    await Util.expectParseSuccess(schema, { a: "a", b: 1 })
  })

  it("union/optional property signatures: should return the best output", async () => {
    const ab = T.struct({ a: T.string, b: T.optional(T.number) })
    const ac = T.struct({ a: T.string, c: T.optional(T.number) })
    const schema = T.union(ab, ac)
    await Util.expectParseSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a" }
    )
    await Util.expectParseSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a", c: 1 },
      Util.onExcessPropertyError
    )
  })

  it("lazy/ baseline", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: T.Transform<A, A> = T.lazy(() =>
      T.struct({
        a: T.string,
        as: T.array(schema)
      })
    )

    await Util.expectParseSuccess(schema, { a: "a1", as: [] })
    await Util.expectParseSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic object, actual null`
    )
    await Util.expectParseFailure(
      schema,
      { a: "a1" },
      `/as is missing`
    )
    await Util.expectParseFailure(
      schema,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 Expected a generic object, actual 1"
    )
  })

  it("lazy/ mutually recursive", async () => {
    interface Expression {
      readonly type: "expression"
      readonly value: number | Operation
    }

    interface Operation {
      readonly type: "operation"
      readonly operator: "+" | "-"
      readonly left: Expression
      readonly right: Expression
    }

    const Expression: T.Transform<Expression, Expression> = T.lazy(() =>
      T.struct({
        type: T.literal("expression"),
        value: T.union(T.number, Operation)
      })
    )

    const Operation: T.Transform<Operation, Operation> = T.lazy(() =>
      T.struct({
        type: T.literal("operation"),
        operator: T.union(T.literal("+"), T.literal("-")),
        left: Expression,
        right: Expression
      })
    )

    const input = {
      type: "operation",
      operator: "+",
      left: {
        type: "expression",
        value: {
          type: "operation",
          operator: "-",
          left: {
            type: "expression",
            value: 2
          },
          right: {
            type: "expression",
            value: 3
          }
        }
      },
      right: {
        type: "expression",
        value: 1
      }
    }

    await Util.expectParseSuccess(Operation, input)
  })

  it("maxLength", async () => {
    const schema = pipe(T.string, T.maxLength(1))
    await Util.expectParseSuccess(schema, "")
    await Util.expectParseSuccess(schema, "a")

    await Util.expectParseFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("nonEmpty", async () => {
    const schema = pipe(T.string, T.nonEmpty())
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "aa")

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("length", async () => {
    const schema = pipe(T.string, T.length(1))
    await Util.expectParseSuccess(schema, "a")

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string at least 1 character(s) long, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("startsWith", async () => {
    const schema = pipe(T.string, T.startsWith("a"))
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "ab")

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string starting with "a", actual ""`
    )
    await Util.expectParseFailure(
      schema,
      "b",
      `Expected a string starting with "a", actual "b"`
    )
  })

  it("endsWith", async () => {
    const schema = pipe(T.string, T.endsWith("a"))
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "ba")

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string ending with "a", actual ""`
    )
    await Util.expectParseFailure(
      schema,
      "b",
      `Expected a string ending with "a", actual "b"`
    )
  })

  it("pattern", async () => {
    const schema = pipe(T.string, T.pattern(/^abb+$/))
    await Util.expectParseSuccess(schema, "abb")
    await Util.expectParseSuccess(schema, "abbb")

    await Util.expectParseFailure(
      schema,
      "ab",
      `Expected a string matching the pattern ^abb+$, actual "ab"`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Expected a string matching the pattern ^abb+$, actual "a"`
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  it("allErrors/tuple. e r e", async () => {
    const schema = pipe(T.tuple(T.string), T.rest(T.number), T.element(T.boolean))
    await Util.expectParseFailure(
      schema,
      [true],
      `/1 is missing, /0 Expected string, actual true`,
      Util.allErrors
    )
  })

  it("allErrors/tuple: missing element", async () => {
    const schema = T.tuple(T.string, T.number)
    await Util.expectParseFailure(schema, [], `/0 is missing, /1 is missing`, Util.allErrors)
  })

  it("allErrors/tuple: wrong type for values", async () => {
    const schema = T.tuple(T.string, T.number)
    await Util.expectParseFailure(
      schema,
      [1, "b"],
      `/0 Expected string, actual 1, /1 Expected number, actual "b"`,
      Util.allErrors
    )
  })

  it("allErrors/tuple: unexpected indexes", async () => {
    const schema = T.tuple()
    await Util.expectParseFailure(
      schema,
      ["a", "b"],
      `/0 is unexpected, /1 is unexpected`,
      Util.allErrors
    )
  })

  it("allErrors/tuple/rest: wrong type for values", async () => {
    const schema = pipe(T.tuple(T.string), T.rest(T.number))
    await Util.expectParseFailure(
      schema,
      ["a", "b", "c"],
      `/1 Expected number, actual "b", /2 Expected number, actual "c"`,
      Util.allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", async () => {
    const schema = pipe(T.array(T.boolean), T.element(T.number), T.element(T.number))
    await Util.expectParseFailure(
      schema,
      ["a", "b"],
      `/0 Expected number, actual "a", /1 Expected number, actual "b"`,
      Util.allErrors
    )
  })

  it("allErrors/struct: missing keys", async () => {
    const schema = T.struct({ a: T.string, b: T.number })
    await Util.expectParseFailure(schema, {}, `/a is missing, /b is missing`, Util.allErrors)
  })

  it("allErrors/struct: wrong type for values", async () => {
    const schema = T.struct({ a: T.string, b: T.number })
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b" },
      `/a Expected string, actual 1, /b Expected number, actual "b"`,
      Util.allErrors
    )
  })

  it("allErrors/struct: unexpected keys", async () => {
    const schema = T.struct({ a: T.number })
    await Util.expectParseFailure(
      schema,
      { a: 1, b: "b", c: "c" },
      `/b is unexpected, /c is unexpected`,
      { ...Util.allErrors, ...Util.onExcessPropertyError }
    )
  })

  it("allErrors/record: wrong type for keys", async () => {
    const schema = T.record(pipe(T.string, T.minLength(2)), T.number)
    await Util.expectParseFailure(
      schema,
      { a: 1, b: 2 },
      `/a Expected a string at least 2 character(s) long, actual "a", /b Expected a string at least 2 character(s) long, actual "b"`,
      Util.allErrors
    )
  })

  it("allErrors/record: wrong type for values", async () => {
    const schema = T.record(T.string, T.number)
    await Util.expectParseFailure(
      schema,
      { a: "a", b: "b" },
      `/a Expected number, actual "a", /b Expected number, actual "b"`,
      Util.allErrors
    )
  })
})
