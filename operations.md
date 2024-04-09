# List of Operations

## READ

Read a value from Input and push it onto the stack.

## PUSH X

Push X (some value) onto the stack.

## POP

Pop value from stack and throw it out.

## DUP

Pop value from stack and push it back onto the stack twice, effectively duplicating it (thus "DUP.")

## SWAP

Swap two topmost values on the stack.

## ADD, SUB, MUL, DIV, MOD

Add, substract, multiply, divide, or modulo top values from the stack:

```text
A op B
```

The first popped value is assigned to `B`, the second popped value is assigned to `A`, and the operation is performed.

For example, the following program prints `2.5`:

```text
PUSH 5
PUSH 2
DIV
PRINT
```

## PRINT

Print topmost value to output.  Note that, unlike most other operations reading from the stack, this operation _does not_ pop any values.
