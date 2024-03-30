/* kid-vm.js -- VM for TYKTWD workshop
 *
 * Author: Dmitri Tikhonov <dtikhonov@live.com>
 */

const stack = [];
const program = [];
let labels = {};
let programCounter = 0;
let errorFound = false;
let inputIdx = 0;

const ops = {
    read() {
        /* Read from input area left to right */
        const inputs = document.getElementById('input').value.trim()
                                                        .split(/\s+/);
        if (inputIdx < inputs.length)
            stack.push(inputs[ inputIdx++ ]);
        else
            err("tried to read input, but ran out of input elements!");
    },
    has_input() {
        const inputs = document.getElementById('input').value.trim()
                                                        .split(/\s+/);
        stack.push(0 + (inputIdx < inputs.length));
    },
    push(args) {
        stack.push(...args);
    },
    pop() {
        return stack.pop();
    },
    mul() {
        const a = Number(stack.pop()), b = Number(stack.pop());
        stack.push(a * b);
    },
    add() {
        const a = Number(stack.pop()), b = Number(stack.pop());
        stack.push(a + b);
    },
    sub() {
        const a = Number(stack.pop()), b = Number(stack.pop());
        stack.push(a - b);
    },
    div() {
        const a = Number(stack.pop()), b = Number(stack.pop());
        stack.push(a / b);
    },
    mod() {
        const a = stack.pop(), b = stack.pop();
        stack.push( Number(b) % Number(a) );
    },
    swap() {
        const a = stack.pop(), b = stack.pop();
        stack.push(a, b);
    },
    stacksize() {
        stack.push( stack.length );
    },
    lt(args) {
        const a = stack.pop(), b = stack.pop();
        stack.push( 0 + (Number(b) < Number(a)) );
    },
    gt(args) {
        const a = stack.pop(), b = stack.pop();
        stack.push( 0 + (Number(b) > Number(a)) );
    },
    le(args) {
        const a = stack.pop(), b = stack.pop();
        stack.push( 0 + (Number(b) <= Number(a)) );
    },
    ge(args) {
        const a = stack.pop(), b = stack.pop();
        stack.push( 0 + (Number(b) >= Number(a)) );
    },
    eq(args) {
        const a = stack.pop(), b = stack.pop();
        /* Using == instead of === makes this work for both strings and
         * numbers, which is what we want.
         */
        stack.push( 0 + (a == b) );
    },
    dup() {
        stack.push( stack[ stack.length - 1] );
    },
    jump(args) {
        const [label] = args;
        if (label in labels)
            programCounter = labels[label];
        else
            /* TODO This should really be a compile-time error as well */
            err(`label ${label} does not exist`);
    },
    if_then(args) {
        const a = stack.pop();
        if (Number(a))
            ops.jump(args);
    },
    rrot() {
        ops._rot('right')
    },
    lrot() {
        ops._rot('left');
    },
    _rot(dir) {
        const count = Number(stack.pop());
        if (stack.length >= count)
        {
            const popped = stack.splice( stack.length - count );
            if (dir === 'right')
                popped.unshift( popped.pop() );
            else
                popped.push( popped.shift() );
            stack.push(...popped);
        }
        else
            err(`stack only has ${stack.length} elements, ${count} wanted`);
    },
    print() {
        console.log( stack[stack.length - 1] );
    },
};

for (const name of ['pop', 'print', 'if_then', 'dup', 'rrot'])
    ops[name].minStackSize = 1;

for (const name of ['add', 'mul', 'sub', 'div', 'swap', 'gt', 'ge', 'lt',
                    'le', 'eq', 'mod'])
    ops[name].minStackSize = 2;

const rightArrow = ' -> ';
const rightArrowRe = /^\s*-> /;

function err(reason)
{
    errorFound = reason;
    alert(reason);
}

function resetRunState()
{
    stack.length = 0;
    programCounter = 0;
    errorFound = false;
    inputIdx = 0;
}

function parseProgram()
{
    function noop() {}

    program.length = 0; labels = {}; // Drop compiled program
    resetRunState();

    const input = document.getElementById("programText").value.trim();
    const lines = input.split('\n');
    for (let [i, line] of lines.entries())
    {
        line = line
            .replace(rightArrowRe, '')  // Make it easy to edit program
            .replace(/^\s+/, '')        // Leading whitespace
        ;
        const trimmed = line
            .replace(/;.*/, '')         // Comments
            .replace(/\s+$/, '')        // Trailing whitespace
        ;
        const tokens = trimmed.split(/\s+/);
        const opName = tokens.shift().toLowerCase().replaceAll(/-/g, '_');
        if (opName === 'label')
        {
            let labelName;
            if (tokens.length < 1)
                err('label not specified');
            else if (labelName = tokens[0], labelName in labels)
                err(`label {tokens[0]} already seen`);
            else
            {
                labels[labelName] = program.length;
                program.push({
                    opFun: noop,
                    args: [],
                    line,
                });
            }
        }
        else if (opName in ops)
            program.push({
                opFun: ops[opName],
                args: tokens,
                line,
            });
        else if (opName === '')
            /* Do not elide empty or comment lines, just treat them as noop */
            program.push({
                opFun: noop,
                args: [],
                line,
            });
        else
        {
            program.push({
                opFun: noop,
                args: [],
                line: '** ERROR **  ' + line,
            });
            err(`Cannot parse line number ${i+1}: ${line}`);
        }
    }
    displayProgram();
    updateStackDisplay();
}

/* Display the program together with program counter: */
function displayProgram()
{
    let text = '', i = 0;
    for (const {line} of program)
    {
        let prefix;
        if (i === programCounter)
            prefix = rightArrow;
        else
            prefix = '    ';
        text += prefix + line + '\n';
        ++i;
    }
    document.getElementById("programText").value = text;
}

function runOneOp()
{
    const prog = program[programCounter++];
    if (!prog.opFun.minStackSize || stack.length >= prog.opFun.minStackSize)
        prog.opFun( prog.args );
    else
        err("not enough elements on the stack, must have at least"
                                                + prog.opFun.minStackSize);
}

function runProgram()
{
    resetRunState();
    while (programCounter < program.length && !errorFound)
        runOneOp();
    displayProgram();
    updateStackDisplay();
}

function stepProgram()
{
    if (programCounter < program.length && !errorFound)
    {
        runOneOp()
        displayProgram();
        updateStackDisplay();
    }
}

function startAgain()
{
    resetRunState();
    displayProgram();
    updateStackDisplay();
}

function updateStackDisplay()
{
    const display = document.getElementById('stackDisplay');
    display.innerHTML = '';
    for (const item of stack) {
        const element = document.createElement('div');
        element.className = 'stack-item';
        element.textContent = item;
        display.appendChild(element);
    }
}

const programsToTry = {
    pushAndAddTwoNumbers: {
        input: "1 2",
        programText: `
PUSH 5
PUSH 6
ADD
PRINT           ; prints to JavaScript console
`.trim(),
        expect: [11],
    },
    addTwoNumbers: {
        input: "1 2",
        programText: `
READ    ; read in a number from input
READ    ; read in another one
ADD     ; add the two numbers together
`.trim(),
        expect: [3],
    },
    divideByTwo: {
        input: "7",
        programText: `
PUSH 2  ; 2 is the divisor
READ    ; read the divident from input
DIV     ; divide the number by two
`.trim(),
        expect: [3.5],
    },
    countOddNumbers: {
        input: "1 2 3 4 5 6 7 8 9 10 11 42",
        programText: `
PUSH 0                      ; initialize count of odd values
LABEL read-input
HAS-INPUT                   ; push 1 if has input, 0 otherwise
IF-THEN read-next-value     ; pop, jump on non-zero value
JUMP end                    ; out of input
LABEL read-next-value
READ                        ; grab next value
PUSH 2                      ; will do modulo 2
MOD                         ; pop two values, push remainder
ADD                         ; conveniently, we can use it as count
JUMP read-input             ; go to beginning of the loop
LABEl end
`.trim(),
        expect: [6],
    },
    rrotTest: {
        programText: `
    push 1
    push 2
    push 3
    push 3
    rrot
`.trim(),
        expect: [3, 1, 2],
    },
    lrotTest: {
        programText: `
    push 1
    push 2
    push 3
    push 3
    lrot
`.trim(),
        expect: [2, 3, 1],
    },
    eq: {
        programText: `
    push 1      ; string on the stack
    stacksize   ; number on the stack
    eq
`.trim(),
        expect: [1],
    },
};

function loadProgram(progName)
{
    if (progName in programsToTry)
    {
        for (const name of ['input', 'programText'])
            document.getElementById(name).value = programsToTry[progName][name] ?? '';
        parseProgram();
    }
    else
        alert(`program ${progName} is unavailable!`);
}

function runTests()
{
    for (const [name, spec] of Object.entries(programsToTry))
    {
        loadProgram(name);
        parseProgram();
        runProgram();
        if (arraysEqual(spec.expect, stack))
            console.log(`test ${name} OK`);
        else
        {
            alert(`test ${name} failed, expected ${spec.expect}, got ${stack}`);
            break;
        }
    }
}

function arraysEqual(a, b) {
    if (a.length === b.length)
    {
        for (let i = 0; i < a.length; ++i)
            if (a[i] != /* sic: not !== */ b[i])
                return false;
        return true;
    }
    else
        return true;
}
