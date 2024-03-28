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
        stack.push( 0 + (Number(b) === Number(a)) );
    },
    streq(args) {
        const a = stack.pop(), b = stack.pop();
        stack.push( '' + a === '' + b );
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
    print() {
        console.log( stack[stack.length - 1] );
    },
};

for (const name of ['pop', 'print', 'if_then'])
    ops[name].minStackSize = 1;

for (const name of ['add', 'mul', 'sub', 'div', 'swap', 'gt', 'ge', 'lt',
                    'le', 'eq', 'streq', 'mod'])
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
            err(`Cannot parse line number ${i+1}: ${line}`);
    }
    displayProgram();
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
