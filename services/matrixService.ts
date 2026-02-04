import type { Fraction, ValidMatrix, RowOperationStep, CalculationResult, DeterminantResult, DeterminantRowOpStep, SystemType, NullSpaceResult, SolutionResult, Term, Polynomial, SymbolicFraction, InverseResult, AdjointMethodResult, CofactorStep, CramersRuleResult, MatrixMultiplicationDetail, MatrixOperationsResult, MatrixOperationStep, AppMode, OperationNode, Operand, NumberFormatOptions, SimplifyTraceStep } from '../types';
import { createLruCache } from './lru';

// #region Basic Fraction and Integer Helpers
const gcd = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    return b === 0 ? a : gcd(b, a % b);
};
const gcdArray = (arr: number[]): number => arr.reduce(gcd, 0);

const simplifyFraction = (f: Fraction): Fraction => {
    if (f.denominator === 0) throw new Error("Denominator cannot be zero.");
    if (f.numerator === 0) return { numerator: 0, denominator: 1 };
    const commonDivisor = gcd(f.numerator, f.denominator);
    let num = f.numerator / commonDivisor;
    let den = f.denominator / commonDivisor;
    if (den < 0) {
        num = -num;
        den = -den;
    }
    return { numerator: num, denominator: den };
};

const addF = (a: Fraction, b: Fraction): Fraction => simplifyFraction({ numerator: a.numerator * b.denominator + b.numerator * a.denominator, denominator: a.denominator * b.denominator });
const subtractF = (a: Fraction, b: Fraction): Fraction => simplifyFraction({ numerator: a.numerator * b.denominator - b.numerator * a.denominator, denominator: a.denominator * b.denominator });
const multiplyF = (a: Fraction, b: Fraction): Fraction => simplifyFraction({ numerator: a.numerator * b.numerator, denominator: a.denominator * b.denominator });
const divideF = (a: Fraction, b: Fraction): Fraction => {
    if (b.numerator === 0) throw new Error("Division by zero fraction.");
    return simplifyFraction({ numerator: a.numerator * b.denominator, denominator: a.denominator * b.numerator });
};
const isZeroF = (f: Fraction) => f.numerator === 0;
const negateF = (f: Fraction): Fraction => ({ numerator: -f.numerator, denominator: f.denominator });
// #endregion

// #region Polynomial and SymbolicFraction Logic

// --- Constants ---
const ZERO_F: Fraction = { numerator: 0, denominator: 1 };
const ONE_F: Fraction = { numerator: 1, denominator: 1 };
const ZERO_TERM: Term = { coefficient: ZERO_F, variables: {} };
const ONE_TERM: Term = { coefficient: ONE_F, variables: {} };
const ZERO_POLY: Polynomial = [ZERO_TERM];
const ONE_POLY: Polynomial = [ONE_TERM];
const ZERO_SF: SymbolicFraction = { numerator: ZERO_POLY, denominator: ONE_POLY };
const ONE_SF: SymbolicFraction = { numerator: ONE_POLY, denominator: ONE_POLY };

// --- Term Helpers ---
const termToKey = (t: Term, ignoreCoeff = false): string => {
    const varPart = Object.entries(t.variables)
        .filter(([, p]) => p !== 0)
        .sort(([varA], [varB]) => varA.localeCompare(varB))
        .map(([v, p]) => `${v}^${p}`)
        .join('*');
    if (ignoreCoeff) return varPart;
    return `${t.coefficient.numerator}/${t.coefficient.denominator}*${varPart}`;
};

const multiplyTerm = (t1: Term, t2: Term): Term => {
    const newCoeff = multiplyF(t1.coefficient, t2.coefficient);
    const newVars: Record<string, number> = { ...t1.variables };
    for (const v in t2.variables) {
        newVars[v] = (newVars[v] || 0) + t2.variables[v];
    }
    return { coefficient: newCoeff, variables: newVars };
}

const divideTerm = (t1: Term, t2: Term): Term => {
    const newCoeff = divideF(t1.coefficient, t2.coefficient);
    const newVars: Record<string, number> = { ...t1.variables };
    for (const v in t2.variables) {
        newVars[v] = (newVars[v] || 0) - t2.variables[v];
        if (newVars[v] === 0) delete newVars[v];
    }
    return { coefficient: newCoeff, variables: newVars };
}

// --- Polynomial Helpers ---
const simplifyPoly = (poly: Polynomial): Polynomial => {
    if (poly.length === 0) return ZERO_POLY;
    const termMap = new Map<string, Term>();
    for (const term of poly) {
        if (isZeroF(term.coefficient)) continue;
        const key = termToKey(term, true);
        if (termMap.has(key)) {
            const existing = termMap.get(key)!;
            const newCoeff = addF(existing.coefficient, term.coefficient);
            if (!isZeroF(newCoeff)) {
                termMap.set(key, { ...existing, coefficient: newCoeff });
            } else {
                termMap.delete(key);
            }
        } else {
            termMap.set(key, term);
        }
    }
    const result = Array.from(termMap.values());
    if (result.length === 0) return ZERO_POLY;
    // Sort for canonical representation
    return result.sort((a,b) => termToKey(b, true).localeCompare(termToKey(a, true)));
}

const sortPoly = (p: Polynomial): Polynomial => {
     return [...p].sort((a,b) => termToKey(b, true).localeCompare(termToKey(a, true)));
}

const arePolyEqual = (p1: Polynomial, p2: Polynomial): boolean => {
    const s1 = sortPoly(p1);
    const s2 = sortPoly(p2);
    if (s1.length !== s2.length) return false;
    for (let i = 0; i < s1.length; i++) {
        if (termToKey(s1[i]) !== termToKey(s2[i])) return false;
    }
    return true;
}

const addPoly = (p1: Polynomial, p2: Polynomial): Polynomial => simplifyPoly([...p1, ...p2]);
const negatePoly = (p: Polynomial): Polynomial => p.map(t => ({...t, coefficient: negateF(t.coefficient)}));
const subtractPoly = (p1: Polynomial, p2: Polynomial): Polynomial => addPoly(p1, negatePoly(p2));

const multiplyPoly = (p1: Polynomial, p2: Polynomial): Polynomial => {
    if (isZeroPoly(p1) || isZeroPoly(p2)) return ZERO_POLY;
    const result: Polynomial = [];
    for (const t1 of p1) {
        for (const t2 of p2) {
            result.push(multiplyTerm(t1, t2));
        }
    }
    return simplifyPoly(result);
};

const isZeroPoly = (p: Polynomial): boolean => p.length === 1 && isZeroF(p[0].coefficient);
const isConstantPoly = (p: Polynomial): boolean => p.length === 1 && Object.keys(p[0].variables).length === 0;

const factorOutGcdMonomial = (poly: Polynomial): { gcdMonomial: Term, remainingPoly: Polynomial } => {
    if (isZeroPoly(poly)) return { gcdMonomial: ZERO_TERM, remainingPoly: ZERO_POLY };
    if (poly.length === 1) return { gcdMonomial: poly[0], remainingPoly: ONE_POLY };

    const numGcd = gcdArray(poly.map(t => t.coefficient.numerator));
    const gcdCoeff = { numerator: numGcd, denominator: 1 };

    const minVarPowers: Record<string, number> = { ...poly[0].variables };
    const allVarKeys = new Set(Object.keys(minVarPowers));
    for (let i = 1; i < poly.length; i++) {
        const termVars = poly[i].variables;
        Object.keys(termVars).forEach(v => allVarKeys.add(v));
    }

    allVarKeys.forEach(v => {
        let minPower = Infinity;
        for (const term of poly) {
            minPower = Math.min(minPower, term.variables[v] || 0);
        }
        if (minPower > 0) {
            minVarPowers[v] = minPower;
        } else {
            delete minVarPowers[v];
        }
    });

    const gcdMonomial = simplifyPoly([ { coefficient: gcdCoeff, variables: minVarPowers } ])[0];
    
    if (isConstantPoly([gcdMonomial]) && gcdMonomial.coefficient.numerator === 1) {
      return { gcdMonomial, remainingPoly: poly };
    }

    const remainingPoly = simplifyPoly(poly.map(term => divideTerm(term, gcdMonomial)));

    return { gcdMonomial, remainingPoly };
}


// --- SymbolicFraction Arithmetic ---
const simplifySF = (sf: SymbolicFraction): SymbolicFraction => {
    let sNum = simplifyPoly(sf.numerator);
    let sDen = simplifyPoly(sf.denominator);

    if (isZeroPoly(sNum)) return ZERO_SF;
    if (isZeroPoly(sDen)) throw new Error("Denominator polynomial cannot be zero.");
    
    if (arePolyEqual(sNum, sDen)) return ONE_SF;

    const { gcdMonomial: numGcd, remainingPoly: numRem } = factorOutGcdMonomial(sNum);
    const { gcdMonomial: denGcd, remainingPoly: denRem } = factorOutGcdMonomial(sDen);

    const commonCoeff = { numerator: gcd(numGcd.coefficient.numerator, denGcd.coefficient.numerator), denominator: 1 };
    const commonVars: Record<string, number> = {};
    const allVars = new Set([...Object.keys(numGcd.variables), ...Object.keys(denGcd.variables)]);
    allVars.forEach(v => {
        const commonPower = Math.min(numGcd.variables[v] || 0, denGcd.variables[v] || 0);
        if (commonPower > 0) commonVars[v] = commonPower;
    });
    const commonFactor = { coefficient: commonCoeff, variables: commonVars };

    const newNumGcd = divideTerm(numGcd, commonFactor);
    const newDenGcd = divideTerm(denGcd, commonFactor);

    sNum = multiplyPoly([newNumGcd], numRem);
    sDen = multiplyPoly([newDenGcd], denRem);

    if (sDen.length > 0 && sDen[0].coefficient.numerator < 0) {
        sNum = negatePoly(sNum);
        sDen = negatePoly(sDen);
    }
    
    return { numerator: sNum, denominator: sDen };
}

export const simplifySymbolicFractionWithTrace = (sf: SymbolicFraction): { result: SymbolicFraction; steps: SimplifyTraceStep[] } => {
    const steps: SimplifyTraceStep[] = [];
    const clone = (value: SymbolicFraction): SymbolicFraction => ({
        numerator: value.numerator.map(t => ({ coefficient: { ...t.coefficient }, variables: { ...t.variables } })),
        denominator: value.denominator.map(t => ({ coefficient: { ...t.coefficient }, variables: { ...t.variables } }))
    });

    let current = clone(sf);
    const normalized = {
        numerator: simplifyPoly(current.numerator),
        denominator: simplifyPoly(current.denominator)
    };
    steps.push({ rule: 'Normalize Polynomials', before: clone(current), after: clone(normalized) });
    current = normalized;

    if (isZeroPoly(current.numerator)) {
        const zeroed = ZERO_SF;
        steps.push({ rule: 'Zero Numerator', before: clone(current), after: clone(zeroed), note: 'Any fraction with zero numerator simplifies to 0.' });
        return { result: zeroed, steps };
    }
    if (isZeroPoly(current.denominator)) {
        throw new Error('Denominator polynomial cannot be zero.');
    }
    if (arePolyEqual(current.numerator, current.denominator)) {
        const one = ONE_SF;
        steps.push({ rule: 'Cancel Equal Polynomials', before: clone(current), after: clone(one), note: 'Numerator equals denominator.' });
        return { result: one, steps };
    }

    const { gcdMonomial: numGcd, remainingPoly: numRem } = factorOutGcdMonomial(current.numerator);
    const { gcdMonomial: denGcd, remainingPoly: denRem } = factorOutGcdMonomial(current.denominator);

    const commonCoeff = { numerator: gcd(numGcd.coefficient.numerator, denGcd.coefficient.numerator), denominator: 1 };
    const commonVars: Record<string, number> = {};
    const allVars = new Set([...Object.keys(numGcd.variables), ...Object.keys(denGcd.variables)]);
    allVars.forEach(v => {
        const commonPower = Math.min(numGcd.variables[v] || 0, denGcd.variables[v] || 0);
        if (commonPower > 0) commonVars[v] = commonPower;
    });
    const commonFactor = { coefficient: commonCoeff, variables: commonVars };

    const newNumGcd = divideTerm(numGcd, commonFactor);
    const newDenGcd = divideTerm(denGcd, commonFactor);

    const reduced = {
        numerator: multiplyPoly([newNumGcd], numRem),
        denominator: multiplyPoly([newDenGcd], denRem)
    };
    steps.push({ rule: 'Cancel Common Factors', before: clone(current), after: clone(reduced) });
    current = reduced;

    if (current.denominator.length > 0 && current.denominator[0].coefficient.numerator < 0) {
        const signAdjusted = {
            numerator: negatePoly(current.numerator),
            denominator: negatePoly(current.denominator)
        };
        steps.push({ rule: 'Normalize Sign', before: clone(current), after: clone(signAdjusted), note: 'Move negative sign to numerator.' });
        current = signAdjusted;
    }

    const final = simplifySF(current);
    steps.push({ rule: 'Final Simplify', before: clone(current), after: clone(final) });
    return { result: final, steps };
};

export const addSF = (a: SymbolicFraction, b: SymbolicFraction): SymbolicFraction => simplifySF({
    numerator: addPoly(multiplyPoly(a.numerator, b.denominator), multiplyPoly(b.numerator, a.denominator)),
    denominator: multiplyPoly(a.denominator, b.denominator)
});
export const subtractSF = (a: SymbolicFraction, b: SymbolicFraction): SymbolicFraction => simplifySF({
    numerator: subtractPoly(multiplyPoly(a.numerator, b.denominator), multiplyPoly(b.numerator, a.denominator)),
    denominator: multiplyPoly(a.denominator, b.denominator)
});
export const multiplySF = (a: SymbolicFraction, b: SymbolicFraction): SymbolicFraction => simplifySF({
    numerator: multiplyPoly(a.numerator, b.numerator),
    denominator: multiplyPoly(a.denominator, b.denominator)
});
export const divideSF = (a: SymbolicFraction, b: SymbolicFraction): SymbolicFraction => {
    if(isZeroPoly(b.numerator)) throw new Error("Symbolic division by zero polynomial.");
    return simplifySF({
        numerator: multiplyPoly(a.numerator, b.denominator),
        denominator: multiplyPoly(a.denominator, b.numerator)
    })
};
export const isZeroSF = (sf: SymbolicFraction): boolean => isZeroPoly(sf.numerator);
const negateSF = (sf: SymbolicFraction): SymbolicFraction => ({...sf, numerator: negatePoly(sf.numerator)});
const cloneMatrix = (m: ValidMatrix): ValidMatrix => m.map(row => row.map(cell => ({ numerator: [...cell.numerator], denominator: [...cell.denominator] })));

export const createConstantSF = (value: number): SymbolicFraction => {
    if (!Number.isFinite(value)) throw new Error("Cannot create constant from non-finite value.");
    const numerator = value;
    const denominator = 1;
    const coefficient = simplifyFraction({ numerator, denominator });
    return simplifySF({ numerator: [ { coefficient, variables: {} } ], denominator: ONE_POLY });
};

export const isVariableExpression = (sf: SymbolicFraction): boolean => {
    const checkPoly = (p: Polynomial) => p.some(term => Object.keys(term.variables).length > 0);
    return checkPoly(sf.numerator) || checkPoly(sf.denominator);
};

export const areSFEqual = (sf1: SymbolicFraction, sf2: SymbolicFraction): boolean => {
    const s1 = simplifySF(sf1);
    const s2 = simplifySF(sf2);
    return arePolyEqual(s1.numerator, s2.numerator) && arePolyEqual(s1.denominator, s2.denominator);
}
// #endregion

// #region Parsing and Formatting
export const validateInput = (input: string): boolean => {
    if (input.trim() === '') return true;
    try {
        parseInput(input);
        return true;
    } catch (e) {
        return false;
    }
};

export const parseInput = (input: string): SymbolicFraction => {
    const cleanedInput = input.trim().replace(/\s/g, '');
    
    // This more robust regex correctly handles unary minus vs. binary subtraction
    const tokenized = cleanedInput.replace(/([a-zA-Z0-9\)])-/g, '$1+-');

    const parts = tokenized.split('+').filter(p => p);

    let finalPoly: Polynomial = [];

    for (const part of parts) {
        const match = part.match(/^(-?(?:\d+(?:\/\d+)?)?)(.*)$/);
        if (!match) throw new Error(`Invalid term: ${part}`);

        let coeffStr = match[1];
        const varsStr = match[2];

        let coefficient: Fraction;
        if (coeffStr === '' || coeffStr === '+') {
            coefficient = ONE_F;
        } else if (coeffStr === '-') {
            coefficient = { numerator: -1, denominator: 1 };
        } else {
            if (coeffStr.includes('/')) {
                const [num, den] = coeffStr.split('/').map(s => parseInt(s, 10));
                if (isNaN(num) || isNaN(den) || den === 0) throw new Error(`Invalid fraction in term: ${part}`);
                coefficient = simplifyFraction({ numerator: num, denominator: den });
            } else if (coeffStr.includes('.')) {
                 const decimal = parseFloat(coeffStr);
                 const factor = Math.pow(10, (coeffStr.split('.')[1] || '').length);
                 coefficient = simplifyFraction({ numerator: Math.round(decimal * factor), denominator: factor });
            } else {
                 coefficient = { numerator: parseInt(coeffStr, 10), denominator: 1 };
            }
        }
        
        const variables: Record<string, number> = {};
        if (varsStr) {
            const varRegex = /([a-zA-Z])(?:\^(\d+))?/g;
            let varMatch;
            while ((varMatch = varRegex.exec(varsStr)) !== null) {
                const variable = varMatch[1];
                const power = varMatch[2] ? parseInt(varMatch[2], 10) : 1;
                variables[variable] = (variables[variable] || 0) + power;
            }
        }

        finalPoly.push({ coefficient, variables });
    }

    return simplifySF({ numerator: simplifyPoly(finalPoly), denominator: ONE_POLY });
};


export const stringifySymbolicFraction = (sf: SymbolicFraction | null): string => {
    if (!sf) return '';

    const stringifyPoly = (p: Polynomial): string => {
        if (isZeroPoly(p)) return '0';
        return p.map((term, index) => {
            let termStr = '';
            const isOne = Math.abs(term.coefficient.numerator) === 1 && term.coefficient.denominator === 1;
            const hasVars = Object.keys(term.variables).length > 0;
            
            if (term.coefficient.numerator < 0) {
                 termStr += (index > 0) ? ' - ' : '-';
            } else if (index > 0) {
                 termStr += ' + ';
            }

            const absNum = Math.abs(term.coefficient.numerator);
            if (!isOne || !hasVars) {
                if (term.coefficient.denominator === 1) {
                    termStr += `${absNum}`;
                } else {
                     termStr += `${absNum}/${term.coefficient.denominator}`;
                }
            }
            
            const varStr = Object.entries(term.variables)
                .sort(([varA], [varB]) => varA.localeCompare(varB))
                .map(([v, p]) => p > 1 ? `${v}^${p}` : v)
                .join('');

            return `${termStr}${varStr}`;

        }).join('');
    };
    
    const numStr = stringifyPoly(sf.numerator);
    const denStr = stringifyPoly(sf.denominator);

    if (isConstantPoly(sf.denominator) && sf.denominator[0].coefficient.numerator === 1) return numStr;
    if (sf.numerator.length > 1 && sf.denominator.length > 1) return `(${numStr})/(${denStr})`;
    if (sf.numerator.length > 1) return `(${numStr})/${denStr}`;
    if (sf.denominator.length > 1) return `${numStr}/(${denStr})`;
    return `${numStr}/${denStr}`;
};

const formatPolyToLatex = (p: Polynomial, parenthesis: boolean = false): string => {
    if (isZeroPoly(p)) return '0';
    let body = p.map((term, index) => {
        const isFirst = index === 0;
        let sign = '';
        if (term.coefficient.numerator < 0) {
            sign = ' - ';
        } else if (!isFirst) {
            sign = ' + ';
        }

        const absCoeff = { ...term.coefficient, numerator: Math.abs(term.coefficient.numerator) };
        const isOne = absCoeff.numerator === 1 && absCoeff.denominator === 1;
        const hasVars = Object.keys(term.variables).length > 0;
        
        let coeffLatex = '';
        if (!isOne || !hasVars) {
             if (absCoeff.denominator === 1) {
                coeffLatex = `${absCoeff.numerator}`;
            } else {
                coeffLatex = `\\frac{${absCoeff.numerator}}{${absCoeff.denominator}}`;
            }
        }

        const varLatex = Object.entries(term.variables)
            .sort(([varA], [varB]) => varA.localeCompare(varB))
            .map(([v, p]) => p > 1 ? `${v}^{${p}}` : v)
            .join('');

        return `${isFirst ? (term.coefficient.numerator < 0 ? '-' : '') : sign}${coeffLatex}${varLatex}`;
    }).join('');

    if (body.startsWith(' + ')) body = body.substring(3);

    if (parenthesis && (p.length > 1 || (p.length === 1 && p[0].coefficient.numerator < 0))) return `(${body})`;
    return body;
}


export const formatSymbolicFractionToLatex = (f: SymbolicFraction): string => {
    const numLatex = formatPolyToLatex(f.numerator, f.numerator.length > 1);
    const denPoly = f.denominator;
    
    if (isConstantPoly(denPoly) && denPoly[0].coefficient.numerator === 1 && denPoly[0].coefficient.denominator === 1) {
        return numLatex;
    }
    
    const denLatex = formatPolyToLatex(denPoly, true);
    return `\\frac{${numLatex}}{${denLatex}}`;
};


const formatTermLatex = (coeff: SymbolicFraction, variable: string, isFirst: boolean): string => {
    if (isZeroSF(coeff)) return '';
    const isNegative = coeff.numerator[0].coefficient.numerator < 0;
    
    const sign = isNegative ? ' - ' : (isFirst ? '' : ' + ');
    
    const absCoeff = isNegative ? negateSF(coeff) : coeff;
    const isOne = arePolyEqual(absCoeff.numerator, ONE_POLY) && arePolyEqual(absCoeff.denominator, ONE_POLY);

    let coeffStr = '';
    if(!isOne){
        coeffStr = formatSymbolicFractionToLatex(absCoeff);
    }
     
    return `${isFirst && !isNegative ? '' : sign}${coeffStr}${variable}`;
}

export const formatMatrixToLatex = (m: ValidMatrix): string => {
    if (!m || m.length === 0 || m[0].length === 0) return `\\begin{pmatrix} \\end{pmatrix}`;
    const body = m.map(row => row.map(f => formatSymbolicFractionToLatex(f)).join(' & ')).join(' \\\\ ');
    return `\\begin{pmatrix}${body}\\end{pmatrix}`;
};

export const formatAugmentedMatrixToLatex = (m: ValidMatrix, systemType: SystemType, augmentedCols: number = 1): string => {
    const totalCols = m[0]?.length || 0;
    if (m.length === 0 || totalCols === 0) return `\\begin{pmatrix} \\end{pmatrix}`;
    
    const coeffCols = totalCols - augmentedCols;
    
    if (systemType === 'homogeneous' && augmentedCols === 1) { // Normal case
        return formatMatrixToLatex(m);
    }

    if (coeffCols <= 0) { 
         return `\\left[ \\begin{array}{${'c'.repeat(totalCols)}} ${m.map(row => row.map(formatSymbolicFractionToLatex).join(' & ')).join('\\\\')} \\end{array} \\right]`;
    }

    const colFormat = `${'c'.repeat(coeffCols)}|${'c'.repeat(augmentedCols)}`;
    const body = m.map(row => {
        const coeff = row.slice(0, coeffCols).map(f => formatSymbolicFractionToLatex(f)).join(' & ');
        const aug = row.slice(coeffCols).map(f => formatSymbolicFractionToLatex(f)).join(' & ');
        return `${coeff} & ${aug}`;
    }).join(' \\\\ ');
    return `\\left[ \\begin{array}{${colFormat}} ${body} \\end{array} \\right]`;
};

export const formatVectorsToLatex = (vectors: ValidMatrix[]): string => {
    return vectors.map(v => formatMatrixToLatex(v)).join(', ');
};

const buildSolutionVectorLatex = (
    numVars: number,
    particularSolution: SymbolicFraction[],
    homogeneousBasis: ValidMatrix[],
    freeVarNames: string[]
): string => {
    const hasParticular = particularSolution.length > 0 && particularSolution.some(f => !isZeroSF(f));
    const pVector = hasParticular ? formatMatrixToLatex(particularSolution.map(f => [f])) : '';

    let hPart = '';
    if (homogeneousBasis.length > 0) {
        hPart = homogeneousBasis.map((vec, i) => `${freeVarNames[i]} ${formatMatrixToLatex(vec)}`).join(' + ');
    }

    if (pVector && hPart) {
        return `\\mathbf{x} = ${pVector} + ${hPart}`;
    }
    if (pVector) {
        return `\\mathbf{x} = ${pVector}`;
    }
    if (hPart) {
        return `\\mathbf{x} = ${hPart}`;
    }
    return `\\mathbf{x} = ${formatMatrixToLatex(Array.from({ length: numVars }, () => [ZERO_SF]))}`;
};

export const generateAssumptionSteps = (condition: SymbolicFraction): string[] => {
    const steps: string[] = [];
    const initialLatex = `${formatSymbolicFractionToLatex(condition)} \\neq 0`;
    steps.push(initialLatex);

    let currentPoly = condition.numerator;

    if (!isConstantPoly(condition.denominator) || !arePolyEqual(condition.denominator, ONE_POLY)) {
        const numLatex = `${formatPolyToLatex(currentPoly)} \\neq 0`;
        if (steps[steps.length - 1] !== numLatex) {
            steps.push(numLatex);
        }
    }

    const allVars = new Set<string>();
    let constantTerm: Term | undefined;
    const variableTerms: Term[] = [];

    for (const term of currentPoly) {
        if (Object.keys(term.variables).length === 0) {
            constantTerm = term;
        } else {
            variableTerms.push(term);
            Object.keys(term.variables).forEach(v => allVars.add(v));
        }
    }

    const numVars = allVars.size;

    if (numVars === 1 && variableTerms.length === 1 && Object.values(variableTerms[0].variables)[0] === 1) {
        const varTerm = variableTerms[0];
        const constTermVal = constantTerm ? constantTerm.coefficient : ZERO_F;

        const rhs = negateF(constTermVal);
        const lhsLatex = formatPolyToLatex([varTerm]);
        const rhsLatex = formatSymbolicFractionToLatex({ numerator: [{ coefficient: rhs, variables: {} }], denominator: ONE_POLY });
        
        const step2Latex = `${lhsLatex} \\neq ${rhsLatex}`;
        if (steps[steps.length - 1] !== step2Latex) {
            steps.push(step2Latex);
        }

        const varCoeff = varTerm.coefficient;
        if (!isZeroF(varCoeff)) {
            const finalRhs = divideF(rhs, varCoeff);
            const varName = Object.keys(varTerm.variables)[0];

            const finalRhsLatex = formatSymbolicFractionToLatex({ numerator: [{ coefficient: finalRhs, variables: {} }], denominator: ONE_POLY });
            const step3Latex = `${varName} \\neq ${finalRhsLatex}`;
            if (steps[steps.length - 1] !== step3Latex) {
                steps.push(step3Latex);
            }
        }
    }
    else if (numVars > 0 && variableTerms.length > 0 && constantTerm && !isZeroF(constantTerm.coefficient)) {
        const lhsPoly = variableTerms;
        const rhs = negateF(constantTerm.coefficient);

        const lhsLatex = formatPolyToLatex(lhsPoly);
        const rhsLatex = formatSymbolicFractionToLatex({ numerator: [{ coefficient: rhs, variables: {} }], denominator: ONE_POLY });
        
        const finalStepLatex = `${lhsLatex} \\neq ${rhsLatex}`;
        if (steps[steps.length - 1] !== finalStepLatex) {
            steps.push(finalStepLatex);
        }
    }
    
    return [...new Set(steps)];
};
// #endregion

// #region Matrix Operations
const getMinor = (m: ValidMatrix, r: number, c: number): ValidMatrix => m.filter((_, i) => i !== r).map(row => row.filter((_, j) => j !== c));
function identityMatrix(n: number): ValidMatrix {
    const M: ValidMatrix = [];
    for (let i = 0; i < n; i++) {
        M[i] = [];
        for (let j = 0; j < n; j++) {
            M[i][j] = (i === j) ? ONE_SF : ZERO_SF;
        }
    }
    return M;
}
const transpose = (m: ValidMatrix): ValidMatrix => {
    if (m.length === 0) return [];
    const result: ValidMatrix = [];
    for (let j = 0; j < m[0].length; j++) {
        result[j] = [];
        for (let i = 0; i < m.length; i++) {
            result[j][i] = m[i][j];
        }
    }
    return result;
}

const addMatricesWithDetails = (m1: ValidMatrix, m2: ValidMatrix): MatrixMultiplicationDetail => {
    if (m1.length !== m2.length || m1[0].length !== m2[0].length) throw new Error("Matrices must have the same dimensions for addition.");
    const result: ValidMatrix = [];
    const steps: { position: string; calculation: string }[] = [];
    for (let i = 0; i < m1.length; i++) {
        result[i] = [];
        for (let j = 0; j < m1[0].length; j++) {
            const sum = addSF(m1[i][j], m2[i][j]);
            result[i][j] = sum;
            steps.push({
                position: `(Result)_{${i+1}${j+1}}`,
                calculation: `C_{${i+1}${j+1}} = ${formatSymbolicFractionToLatex(m1[i][j])} + ${formatSymbolicFractionToLatex(m2[i][j])} = ${formatSymbolicFractionToLatex(sum)}`
            });
        }
    }
    return { product: result, steps };
}

const subtractMatricesWithDetails = (m1: ValidMatrix, m2: ValidMatrix): MatrixMultiplicationDetail => {
    if (m1.length !== m2.length || m1[0].length !== m2[0].length) throw new Error("Matrices must have the same dimensions for subtraction.");
    const result: ValidMatrix = [];
    const steps: { position: string; calculation: string }[] = [];
    for (let i = 0; i < m1.length; i++) {
        result[i] = [];
        for (let j = 0; j < m1[0].length; j++) {
            const diff = subtractSF(m1[i][j], m2[i][j]);
            result[i][j] = diff;
            steps.push({
                position: `(Result)_{${i+1}${j+1}}`,
                calculation: `C_{${i+1}${j+1}} = ${formatSymbolicFractionToLatex(m1[i][j])} - (${formatSymbolicFractionToLatex(m2[i][j])}) = ${formatSymbolicFractionToLatex(diff)}`
            });
        }
    }
    return { product: result, steps };
}

const multiplyMatricesWithDetails = (m1: ValidMatrix, m2: ValidMatrix): MatrixMultiplicationDetail => {
    if (m1.length === 0 || m2.length === 0 || m1[0].length !== m2.length) {
        throw new Error(`Cannot multiply matrices: inner dimensions do not match (${m1[0]?.length || 0} vs ${m2.length}).`);
    }
    const result: ValidMatrix = [];
    const steps: { position: string; calculation: string }[] = [];
    const n = m1.length;
    const p = m2[0].length;
    const m = m1[0].length;

    for (let i = 0; i < n; i++) {
        result[i] = [];
        for (let j = 0; j < p; j++) {
            let sum = ZERO_SF;
            let calcLatex = '';
            for (let k = 0; k < m; k++) {
                const term = multiplySF(m1[i][k], m2[k][j]);
                sum = addSF(sum, term);
                calcLatex += `(${formatSymbolicFractionToLatex(m1[i][k])})(${formatSymbolicFractionToLatex(m2[k][j])})`;
                if (k < m - 1) {
                    calcLatex += ' + \\\\ ';
                }
            }
            result[i][j] = sum;
            steps.push({
                position: `(Product)_{${i+1}${j+1}}`,
                calculation: `C_{${i+1}${j+1}} = ${calcLatex} \\\\ = ${formatSymbolicFractionToLatex(sum)}`
            });
        }
    }
    return { product: result, steps };
};
// #endregion

// #region Determinant Logic
function determinantByCofactor(matrix: ValidMatrix, isSummarized: boolean): { det: SymbolicFraction, steps: string[], summaryMessage?: string } {
    if (isSummarized) {
        return {
            det: ZERO_SF, // Placeholder, will be replaced by row op result
            steps: [],
            summaryMessage: `Cofactor expansion is computationally expensive (O(n!)) and was skipped for the initial calculation.`
        }
    }

    const steps: string[] = [];
    
    function cofactorRecursive(mat: ValidMatrix, recursionDepth: number): SymbolicFraction {
        const size = mat.length;
        if (size === 0) return ONE_SF;
        if (size === 1) return mat[0][0];

        if (size === 2) {
            const a = mat[0][0], b = mat[0][1], c = mat[1][0], d = mat[1][1];
            const result = subtractSF(multiplySF(a, d), multiplySF(b, c));
            steps.push(`${"\\quad".repeat(recursionDepth)}\\det${formatMatrixToLatex(mat)} = (${formatSymbolicFractionToLatex(a)})(${formatSymbolicFractionToLatex(d)}) - (${formatSymbolicFractionToLatex(b)})(${formatSymbolicFractionToLatex(c)}) = ${formatSymbolicFractionToLatex(result)}`);
            return result;
        }

        let bestLine = { type: 'row', index: 0, zeros: 0 };
        for (let i = 0; i < size; i++) {
            const rowZeros = mat[i].filter(isZeroSF).length;
            const colZeros = mat.map(row => row[i]).filter(isZeroSF).length;
            if (rowZeros > bestLine.zeros) bestLine = { type: 'row', index: i, zeros: rowZeros };
            if (colZeros > bestLine.zeros) bestLine = { type: 'col', index: i, zeros: colZeros };
        }

        steps.push(`${"\\quad".repeat(recursionDepth)}\\text{Expanding det}${formatMatrixToLatex(mat)} \\text{ along ${bestLine.type} ${bestLine.index + 1}}:`);
        
        let total = ZERO_SF;
        const expansionTerms: string[] = [];

        if (bestLine.type === 'row') {
            const i = bestLine.index;
            for (let j = 0; j < size; j++) {
                const element = mat[i][j];
                if (isZeroSF(element)) continue;
                const sign = (i + j) % 2 === 0 ? ONE_SF : negateSF(ONE_SF);
                const minor = getMinor(mat, i, j);
                const cofactorValue = cofactorRecursive(minor, recursionDepth + 1);
                const term = multiplySF(sign, multiplySF(element, cofactorValue));
                total = addSF(total, term);
                
                const signStr = (i + j) % 2 === 0 ? '+' : '-';
                expansionTerms.push(`${signStr} (${formatSymbolicFractionToLatex(element)}) \\cdot \\det${formatMatrixToLatex(minor)}`);
            }
        } else {
            const j = bestLine.index;
            for (let i = 0; i < size; i++) {
                const element = mat[i][j];
                if (isZeroSF(element)) continue;
                const sign = (i + j) % 2 === 0 ? ONE_SF : negateSF(ONE_SF);
                const minor = getMinor(mat, i, j);
                const cofactorValue = cofactorRecursive(minor, recursionDepth + 1);
                const term = multiplySF(sign, multiplySF(element, cofactorValue));
                total = addSF(total, term);
                
                const signStr = (i + j) % 2 === 0 ? '+' : '-';
                expansionTerms.push(`${signStr} (${formatSymbolicFractionToLatex(element)}) \\cdot \\det${formatMatrixToLatex(minor)}`);
            }
        }
        
        steps.push(`${"\\quad".repeat(recursionDepth)} = ${expansionTerms.join(' ')} \\\\ = ${formatSymbolicFractionToLatex(total)}`);
        return total;
    }
    
    const det = cofactorRecursive(matrix, 0);
    return { det, steps };
}

function determinantByRowOps(matrix: ValidMatrix): { 
    det: SymbolicFraction, 
    steps: DeterminantRowOpStep[], 
    finalCalc: { description: string, equation: string }, 
    conditions: SymbolicFraction[] 
} {
    if (matrix.length !== matrix[0].length) {
        throw new Error("Matrix must be square for determinant calculation.");
    }
    
    let mat = cloneMatrix(matrix);
    const n = mat.length;
    const steps: DeterminantRowOpStep[] = [];
    const conditions: SymbolicFraction[] = [];
    let numSwaps = 0;

    for (let pivotCol = 0; pivotCol < n; pivotCol++) {
        let pivotRow = pivotCol;
        while (pivotRow < n && isZeroSF(mat[pivotRow][pivotCol])) {
            pivotRow++;
        }

        if (pivotRow < n) {
            if (pivotRow !== pivotCol) {
                const matrixBefore = cloneMatrix(mat);
                [mat[pivotCol], mat[pivotRow]] = [mat[pivotRow], mat[pivotCol]];
                numSwaps++;
                const op = `R_{${pivotCol + 1}} \\leftrightarrow R_{${pivotRow + 1}}`;
                
                const E = identityMatrix(n);
                [E[pivotCol], E[pivotRow]] = [E[pivotRow], E[pivotCol]];

                steps.push({
                    operation: op, elementaryMatrix: E, matrixBefore: matrixBefore, matrixAfter: cloneMatrix(mat),
                    description: `Swap rows to bring a non-zero pivot to the diagonal. This multiplies the determinant by -1.`
                });
            }

            const pivotValue = mat[pivotCol][pivotCol];
            const numeratorCondition: SymbolicFraction = { numerator: pivotValue.numerator, denominator: ONE_POLY };
            if (isVariableExpression(numeratorCondition)) {
                if (!conditions.some(c => areSFEqual(c, numeratorCondition))) conditions.push(numeratorCondition);
            }
            if (!arePolyEqual(pivotValue.denominator, ONE_POLY)) {
                const denominatorCondition: SymbolicFraction = { numerator: pivotValue.denominator, denominator: ONE_POLY };
                if (isVariableExpression(denominatorCondition)) {
                    if (!conditions.some(c => areSFEqual(c, denominatorCondition))) conditions.push(denominatorCondition);
                }
            }

            for (let i = pivotCol + 1; i < n; i++) {
                const factor = mat[i][pivotCol];
                if (!isZeroSF(factor)) {
                    const matrixBefore = cloneMatrix(mat);
                    const multiple = divideSF(factor, pivotValue);
                    const op = `R_{${i + 1}} \\to R_{${i + 1}} - \\left(${formatSymbolicFractionToLatex(multiple)}\\right) R_{${pivotCol + 1}}`;
                    
                    const E = identityMatrix(n);
                    E[i][pivotCol] = negateSF(multiple);

                    for (let j = pivotCol; j < n; j++) {
                        mat[i][j] = subtractSF(mat[i][j], multiplySF(multiple, mat[pivotCol][j]));
                    }
                    steps.push({
                        operation: op, elementaryMatrix: E, matrixBefore: matrixBefore, matrixAfter: cloneMatrix(mat),
                        description: `Eliminate the entry at position (${i+1}, ${pivotCol+1}). This operation does not change the determinant.`
                    });
                }
            }
        } else {
            const det = ZERO_SF;
            const finalCalc = {
                description: `During row reduction, column ${pivotCol + 1} was found to have no pivot. This means the matrix is singular.`,
                equation: `\\det(A) = 0`
            };
            return { det, steps, finalCalc, conditions };
        }
    }

    const upperTriangularMatrix = mat;
    let detU = ONE_SF;
    for (let i = 0; i < n; i++) {
        detU = multiplySF(detU, upperTriangularMatrix[i][i]);
    }

    const swapFactor = numSwaps % 2 === 1 ? negateSF(ONE_SF) : ONE_SF;
    const finalDet = multiplySF(swapFactor, detU);

    const finalCalcDescription = `The determinant of the resulting upper-triangular matrix U is the product of its diagonal entries. The determinant of the original matrix A is then found by accounting for the ${numSwaps} row swaps performed.`;
    const finalCalcEquation = `\\det(A) = (-1)^{${numSwaps}} \\times \\det(U) = ${formatSymbolicFractionToLatex(swapFactor)} \\times \\left(${formatSymbolicFractionToLatex(detU)}\\right) = ${formatSymbolicFractionToLatex(finalDet)}`;

    return {
        det: finalDet, steps,
        finalCalc: { description: finalCalcDescription, equation: finalCalcEquation },
        conditions
    };
}
// #endregion

// #region Core Calculation Logic (System Solver)
interface CalculationOptions {
    summarized: boolean;
}

export const calculate = (inputMatrix: ValidMatrix, systemType: SystemType, options: CalculationOptions): CalculationResult => {
    
    const initialConditions: SymbolicFraction[] = [];
    for (const row of inputMatrix) {
        for (const cell of row) {
            if (cell && !arePolyEqual(cell.denominator, ONE_POLY)) {
                const condition: SymbolicFraction = { numerator: cell.denominator, denominator: ONE_POLY };
                if (isVariableExpression(condition) && !initialConditions.some(existing => areSFEqual(existing, condition))) {
                    initialConditions.push(condition);
                }
            }
        }
    }
    
    const coeffMatrix = systemType === 'non-homogeneous' 
        ? inputMatrix.map(row => row.slice(0, -1))
        : inputMatrix;
    const isSquare = coeffMatrix.length > 0 && coeffMatrix.length === coeffMatrix[0].length;
    
    const numMatrixCols = inputMatrix.length > 0 ? inputMatrix[0].length : 0;
    const pivotColumnCountForMain = systemType === 'non-homogeneous' 
        ? numMatrixCols - 1
        : numMatrixCols;
        
    const { steps: gjSteps, finalMatrix: rrefMatrix, pivotColumns, conditions, summaryMessage, refMatrix } = gaussJordanElimination(inputMatrix, pivotColumnCountForMain, options.summarized);

    const combinedConditions = [...initialConditions, ...conditions];
    const uniqueConditions: SymbolicFraction[] = [];
    for (const cond of combinedConditions) {
        if (!uniqueConditions.some(c => areSFEqual(c, cond))) {
            uniqueConditions.push(cond);
        }
    }

    const result: CalculationResult = {
        systemType,
        conditions: uniqueConditions,
        gaussJordanSteps: [{operation: 'Initial Matrix', matrix: inputMatrix}, ...gjSteps],
        determinant: null,
        rowSpaceBasis: null,
        colSpaceBasis: null,
        nullSpace: null,
        homogeneousSolutionSet: null,
        solutionSetRef: null,
        solutionSetRref: null,
        inverse: null,
        cramersRule: null,
        summaryMessage
    };

    if (isSquare) {
         const {detResult, conditions: detConditions} = getDeterminantDetails(coeffMatrix, options.summarized);
         result.determinant = detResult;
         detConditions.forEach(c => { if (!result.conditions.some(ec => areSFEqual(ec,c))) result.conditions.push(c); });

         if (result.determinant) {
            const { inverse, conditions: invConditions } = getInverseDetails(coeffMatrix, result.determinant.value, options.summarized);
            result.inverse = inverse;
            invConditions.forEach(c => { if (!result.conditions.some(ec => areSFEqual(ec,c))) result.conditions.push(c); });
         }

        if (systemType === 'non-homogeneous') {
            const bVector = inputMatrix.map(row => row[row.length - 1]);
            result.cramersRule = calculateCramersRule(coeffMatrix, bVector, options.summarized);
        } else {
            result.cramersRule = { isApplicable: true };
        }
    }
    
    const rrefCoeffMatrix = rrefMatrix.map(row => row.slice(0, pivotColumnCountForMain));

    // These are properties of the coefficient matrix A, independent of b.
    // So calculate them for both system types.
    result.rowSpaceBasis = calculateRowSpaceBasis(rrefCoeffMatrix);
    result.colSpaceBasis = calculateColSpaceBasis(coeffMatrix, pivotColumns);
    result.nullSpace = calculateNullSpace(rrefCoeffMatrix, options.summarized);

    if (systemType === 'homogeneous') {
        result.homogeneousSolutionSet = generateHomogeneousSolutionSet(rrefMatrix, result.conditions, options.summarized);
    } else { // non-homogeneous
        const { solutionSetRef, solutionSetRref } = generateNonHomogeneousSolutionSets(refMatrix, rrefMatrix, result.conditions, options.summarized);
        result.solutionSetRef = solutionSetRef;
        result.solutionSetRref = solutionSetRref;
    }

    return result;
};

function gaussJordanElimination(matrix: ValidMatrix, pivotColumnCount: number, isSummarized: boolean): { 
    steps: RowOperationStep[], 
    finalMatrix: ValidMatrix,
    pivotColumns: number[],
    conditions: SymbolicFraction[],
    summaryMessage?: string,
    refMatrix: ValidMatrix
} {
    let mat = cloneMatrix(matrix);
    const numRows = mat.length;
    const numCols = numRows > 0 ? mat[0].length : 0;
    
    const steps: RowOperationStep[] = [];
    const conditions: SymbolicFraction[] = [];
    const pivotColumns: number[] = [];
    let pivotRow = 0;
    
    const summaryMessage = isSummarized ? "Intermediate matrix steps were not calculated for performance. Click button to see full calculation." : undefined;

    // Forward elimination (to REF)
    for (let pivotCol = 0; pivotCol < pivotColumnCount && pivotRow < numRows; pivotCol++) {
        let i = pivotRow;
        while (i < numRows && isZeroSF(mat[i][pivotCol])) {
            i++;
        }

        if (i < numRows) {
            if (i !== pivotRow) {
                const op = `R_{${pivotRow + 1}} \\leftrightarrow R_{${i + 1}}`;
                const matrixBefore = cloneMatrix(mat);
                [mat[pivotRow], mat[i]] = [mat[i], mat[pivotRow]];
                steps.push({ operation: op, matrixBefore, matrix: isSummarized ? undefined : cloneMatrix(mat), description: `Swap row ${pivotRow + 1} with row ${i + 1} to move a non-zero entry to the pivot position.` });
            }
            
            pivotColumns.push(pivotCol);
            const pivotValue = mat[pivotRow][pivotCol];

            const numeratorCondition: SymbolicFraction = { numerator: pivotValue.numerator, denominator: ONE_POLY };
            if (isVariableExpression(numeratorCondition) && !conditions.some(c => areSFEqual(c, numeratorCondition))) {
                conditions.push(numeratorCondition);
            }
            if (!arePolyEqual(pivotValue.denominator, ONE_POLY)) {
                const denominatorCondition: SymbolicFraction = { numerator: pivotValue.denominator, denominator: ONE_POLY };
                if (isVariableExpression(denominatorCondition) && !conditions.some(c => areSFEqual(c, denominatorCondition))) {
                    conditions.push(denominatorCondition);
                }
            }
            
            for (let j = pivotRow + 1; j < numRows; j++) {
                const factor = mat[j][pivotCol];
                if (!isZeroSF(factor)) {
                    const matrixBefore = cloneMatrix(mat);
                    const multiple = divideSF(factor, pivotValue);
                    const op = `R_{${j + 1}} \\to R_{${j + 1}} - \\left(${formatSymbolicFractionToLatex(multiple)}\\right) R_{${pivotRow + 1}}`;
                    for (let k = pivotCol; k < numCols; k++) {
                        mat[j][k] = subtractSF(mat[j][k], multiplySF(multiple, mat[pivotRow][k]));
                    }
                    steps.push({ operation: op, matrixBefore, matrix: isSummarized ? undefined : cloneMatrix(mat), description: `Create a zero below the pivot in column ${pivotCol + 1} by subtracting a multiple of the pivot row.` });
                }
            }
            pivotRow++;
        }
    }
    
    const refMatrix = cloneMatrix(mat);
    const refEndIndex = steps.length - 1;

    // Backward elimination (to RREF)
    for (let i = pivotColumns.length - 1; i >= 0; i--) {
        const pRow = i;
        const pCol = pivotColumns[i];
        
        const pivotValue = mat[pRow][pCol];
        if (!areSFEqual(pivotValue, ONE_SF)) {
            const matrixBefore = cloneMatrix(mat);
            const scaleFactor = divideSF(ONE_SF, pivotValue);
            const op = `R_{${pRow + 1}} \\to \\left(${formatSymbolicFractionToLatex(scaleFactor)}\\right) R_{${pRow + 1}}`;
            for (let k = pCol; k < numCols; k++) {
                mat[pRow][k] = multiplySF(mat[pRow][k], scaleFactor);
            }
            steps.push({ operation: op, matrixBefore, matrix: isSummarized ? undefined : cloneMatrix(mat), description: `Scale row ${pRow + 1} to make the pivot entry equal to 1.` });
        }
        
        for (let j = pRow - 1; j >= 0; j--) {
            const factor = mat[j][pCol];
            if (!isZeroSF(factor)) {
                const matrixBefore = cloneMatrix(mat);
                const op = `R_{${j + 1}} \\to R_{${j + 1}} - \\left(${formatSymbolicFractionToLatex(factor)}\\right) R_{${pRow + 1}}`;
                for (let k = pCol; k < numCols; k++) {
                    mat[j][k] = subtractSF(mat[j][k], multiplySF(factor, mat[pRow][k]));
                }
                steps.push({ operation: op, matrixBefore, matrix: isSummarized ? undefined : cloneMatrix(mat), description: `Create a zero above the pivot in column ${pCol + 1} to clear the column.` });
            }
        }
    }
    
    if (isSummarized) {
        if (refEndIndex >= 0 && steps[refEndIndex]) {
            const { steps: fullSteps } = gaussJordanElimination(matrix, pivotColumnCount, false);
            if(refEndIndex >= 0 && steps[refEndIndex] && fullSteps[refEndIndex]) {
                steps[refEndIndex].matrix = fullSteps[refEndIndex].matrix;
            }
        }
    }
     if (steps.length > 0) {
        steps[steps.length - 1].matrix = cloneMatrix(mat);
    }
    
    return { steps, finalMatrix: mat, pivotColumns, conditions, summaryMessage, refMatrix };
}
// #endregion

// #region Vector Space & Solution Sets
function getPivotAndFreeVars(coeffMatrix: ValidMatrix): { pivotCols: number[], freeCols: number[], pivotPositions: Map<number, number> } {
    const numRows = coeffMatrix.length;
    const numCols = numRows > 0 ? coeffMatrix[0].length : 0;
    
    const pivotCols: number[] = [];
    const pivotPositions = new Map<number, number>(); // rowIndex -> colIndex
    
    let lastPivotCol = -1;
    for (let r = 0; r < numRows; r++) {
        const pivotIndex = coeffMatrix[r].findIndex((f, c) => c > lastPivotCol && !isZeroSF(f));
        if (pivotIndex !== -1) {
            pivotCols.push(pivotIndex);
            pivotPositions.set(r, pivotIndex);
            lastPivotCol = pivotIndex;
        }
    }

    const freeCols: number[] = [];
    for (let c = 0; c < numCols; c++) {
        if (!pivotCols.includes(c)) {
            freeCols.push(c);
        }
    }
    return { pivotCols, freeCols, pivotPositions };
}

function calculateRowSpaceBasis(rrefMatrix: ValidMatrix): ValidMatrix[] {
    const coeffMatrix = rrefMatrix.map(row => row.slice(0, rrefMatrix[0].length));
    const nonZeroRows = coeffMatrix.filter(row => row.some(cell => !isZeroSF(cell)));
    return nonZeroRows.map(row => row.map(cell => [cell]));
}

function calculateColSpaceBasis(originalCoeffMatrix: ValidMatrix, pivotColumns: number[]): ValidMatrix[] {
    if (originalCoeffMatrix.length === 0) return [];
    return pivotColumns.map(colIndex =>
        originalCoeffMatrix.map(row => [row[colIndex]])
    );
}

function calculateNullSpace(rrefCoeffMatrix: ValidMatrix, isSummarized: boolean): NullSpaceResult {
    const numVars = rrefCoeffMatrix.length > 0 ? rrefCoeffMatrix[0].length : 0;
    const { freeCols, pivotPositions } = getPivotAndFreeVars(rrefCoeffMatrix);

    const basis: ValidMatrix[] = freeCols.map(freeCol => {
        const basisVector: SymbolicFraction[] = Array(numVars).fill(ZERO_SF);
        basisVector[freeCol] = ONE_SF;
        pivotPositions.forEach((pivotCol, row) => {
            basisVector[pivotCol] = negateSF(rrefCoeffMatrix[row][freeCol]);
        });
        return basisVector.map(cell => [cell]);
    });

    const derivation = isSummarized ? [] : generateSolutionStepsFromRREF(rrefCoeffMatrix, 'homogeneous');
    return { basis, derivation };
}

function generateHomogeneousSolutionSet(rrefMatrix: ValidMatrix, conditions: SymbolicFraction[], isSummarized: boolean): SolutionResult {
    const steps = generateSolutionStepsFromRREF(rrefMatrix, 'homogeneous');
    const simplifiedConditions = conditions.map(c => {
        const steps = generateAssumptionSteps(c);
        return steps[steps.length - 1];
    });
    return { isConsistent: true, steps: isSummarized ? [steps[steps.length - 1]] : steps, conditions: simplifiedConditions };
}

function generateNonHomogeneousSolutionSets(refMatrix: ValidMatrix, rrefMatrix: ValidMatrix, conditions: SymbolicFraction[], isSummarized: boolean): { solutionSetRef: SolutionResult, solutionSetRref: SolutionResult } {
    const numRows = rrefMatrix.length;
    const numCols = numRows > 0 ? rrefMatrix[0].length : 0;
    const numVars = numCols - 1;
    
    const simplifiedConditions = conditions.map(c => {
        const steps = generateAssumptionSteps(c);
        return steps[steps.length - 1];
    });

    for (let r = 0; r < numRows; r++) {
        const row = rrefMatrix[r];
        const isCoeffZero = row.slice(0, numVars).every(isZeroSF);
        const isConstantNonZero = !isZeroSF(row[numVars]);
        if (isCoeffZero && isConstantNonZero) {
            const inconsistentStep = `The system is inconsistent. Row ${r + 1} of the RREF implies $0 = ${formatSymbolicFractionToLatex(row[numVars])}$, which is impossible.`;
            const result = { isConsistent: false, steps: [inconsistentStep], conditions: simplifiedConditions };
            return { solutionSetRef: result, solutionSetRref: result };
        }
    }
    
    const rrefSteps = generateSolutionStepsFromRREF(rrefMatrix, 'non-homogeneous');
    const solutionSetRref = {
        isConsistent: true,
        steps: isSummarized ? [rrefSteps[rrefSteps.length - 1]] : rrefSteps,
        conditions: simplifiedConditions
    };
    
    const refSteps = generateSolutionStepsFromREF(refMatrix);
    const solutionSetRef = {
      isConsistent: true,
      steps: isSummarized ? [refSteps[refSteps.length - 1]] : refSteps,
      conditions: simplifiedConditions
    };

    return { solutionSetRef, solutionSetRref };
}

function generateSolutionStepsFromRREF(rrefMatrix: ValidMatrix, systemType: SystemType): string[] {
    const steps: string[] = [];
    const numCols = rrefMatrix[0]?.length || 0;
    const numVars = systemType === 'non-homogeneous' ? numCols - 1 : numCols;
    
    const coeffMatrix = rrefMatrix.map(row => row.slice(0, numVars));
    const { freeCols, pivotPositions } = getPivotAndFreeVars(coeffMatrix);
    const pivotCols = Array.from(pivotPositions.values());

    steps.push(`\\text{1. From the RREF, write the corresponding system of equations:}`);
    let systemEqs = '';
    const nonZeroRows = rrefMatrix.filter(row => row.some(c => !isZeroSF(c)));

    nonZeroRows.forEach(row => {
        let isFirstTerm = true;
        const terms = row.slice(0, numVars).map((coeff, colIdx) => {
            if (isZeroSF(coeff)) return '';
            const term = formatTermLatex(coeff, `x_{${colIdx + 1}}`, isFirstTerm);
            if (term) isFirstTerm = false;
            return term;
        }).join('');
        const constant = systemType === 'non-homogeneous' ? formatSymbolicFractionToLatex(row[numVars]) : '0';
        systemEqs += `${terms || '0'} = ${constant} \\\\`;
    });
    steps.push(`\\begin{cases} ${systemEqs || '0=0'} \\end{cases}`);
    
    const freeVarNames = freeCols.map(c => `x_{${c+1}}`);
    const pivotVarNames = pivotCols.sort().map(c => `x_{${c+1}}`);

    steps.push(`\\text{2. Identify pivot and free variables:}`);
    steps.push(`\\text{Pivot variables: } ${pivotVarNames.length > 0 ? pivotVarNames.join(', ') : '\\text{None}'}`);
    steps.push(`\\text{Free variables: } ${freeVarNames.length > 0 ? freeVarNames.join(', ') : '\\text{None}'}`);

    if (freeCols.length > 0) {
        steps.push(`\\text{Let } ${freeVarNames.map(v => `${v} = c_{${v.substring(2, v.length-1)}}`).join(', ')} \\text{ where } c_i \\text{ are arbitrary constants.}`);
    }

    steps.push(`\\text{3. Solve for pivot variables in terms of constants and free variables:}`);
    let solutionEqs = '';
    pivotPositions.forEach((pivotCol, row) => {
        let rhs = systemType === 'non-homogeneous' ? rrefMatrix[row][numVars] : ZERO_SF;
        let rhsLatex = systemType === 'non-homogeneous' ? formatSymbolicFractionToLatex(rhs) : '0';
        
        let freeVarTermsLatex = '';
        for (const freeCol of freeCols) {
            const coeff = rrefMatrix[row][freeCol];
            if (!isZeroSF(coeff)) {
                rhs = subtractSF(rhs, coeff);
                freeVarTermsLatex += formatTermLatex(negateSF(coeff), `x_{${freeCol + 1}}`, rhsLatex === '0' && freeVarTermsLatex === '');
            }
        }
        solutionEqs += `x_{${pivotCol + 1}} = ${rhsLatex}${freeVarTermsLatex} \\\\`;
    });
    steps.push(`\\begin{cases} ${solutionEqs || ''} \\end{cases}`);

    steps.push(`\\text{4. Write the general solution in vector form, } \\mathbf{x} = \\mathbf{p} + \\mathbf{x}_h:`);
    const particularSolution: SymbolicFraction[] = Array(numVars).fill(ZERO_SF);
    pivotPositions.forEach((pivotCol, row) => {
        if(systemType === 'non-homogeneous') particularSolution[pivotCol] = rrefMatrix[row][numVars];
    });

    const homogeneousBasis: ValidMatrix[] = freeCols.map(freeCol => {
        const basisVector: SymbolicFraction[] = Array(numVars).fill(ZERO_SF);
        basisVector[freeCol] = ONE_SF;
        pivotPositions.forEach((pivotCol, row) => {
            basisVector[pivotCol] = negateSF(coeffMatrix[row][freeCol]);
        });
        return basisVector.map(cell => [cell]);
    });
    
    steps.push(buildSolutionVectorLatex(numVars, particularSolution, homogeneousBasis, freeVarNames));

    return steps;
}

function generateSolutionStepsFromREF(refMatrix: ValidMatrix): string[] {
    const steps: string[] = [];
    const numCols = refMatrix[0]?.length || 0;
    const numVars = numCols - 1;
    
    const coeffMatrix = refMatrix.map(row => row.slice(0, numVars));
    
    steps.push(`\\text{1. From the REF, write the corresponding system of equations:}`);
    let systemEqs = '';
    const nonZeroRows = refMatrix.filter(row => row.slice(0, numVars).some(c => !isZeroSF(c)));
    nonZeroRows.forEach(row => {
        let isFirstTerm = true;
        const terms = row.slice(0, numVars).map((coeff, colIdx) => {
            if (isZeroSF(coeff)) return '';
            const term = formatTermLatex(coeff, `x_{${colIdx + 1}}`, isFirstTerm);
            if (term) isFirstTerm = false;
            return term;
        }).join('');
        systemEqs += `${terms || '0'} = ${formatSymbolicFractionToLatex(row[numVars])} \\\\`;
    });
    steps.push(`\\begin{cases} ${systemEqs || '0=0'} \\end{cases}`);

    const { freeCols, pivotPositions } = getPivotAndFreeVars(coeffMatrix);
    const pivotVarIndices = Array.from(pivotPositions.values());
    const freeVarNames = freeCols.map(c => `x_{${c+1}}`);

    steps.push(`\\text{2. Identify free variables and set them to parameters:}`);
    if (freeCols.length > 0) {
        steps.push(`\\text{Free variables: } ${freeVarNames.join(', ')}. \\text{ Let } ${freeVarNames.map(v => `${v} = c_{${v.substring(2, v.length-1)}}`).join(', ')}.`);
    } else {
        steps.push(`\\text{No free variables. The system has a unique solution.}`);
    }

    steps.push(`\\text{3. Solve for pivot variables using back substitution, starting from the last equation:}`);
    const solvedVars: Map<number, SymbolicFraction> = new Map();
    const pivotRows = Array.from(pivotPositions.keys()).sort((a,b) => b-a);
    
    for (const rowIdx of pivotRows) {
        const pivotCol = pivotPositions.get(rowIdx)!;
        let rhs = refMatrix[rowIdx][numVars];
        let pivotCoeff = refMatrix[rowIdx][pivotCol];

        let equationLatex = `\\text{From row ${rowIdx+1}: }`;
        let isFirst = true;
        refMatrix[rowIdx].slice(0, numVars).forEach((c, i) => {
            if(!isZeroSF(c)) equationLatex += formatTermLatex(c, `x_{${i+1}}`, isFirst);
            if(!isZeroSF(c)) isFirst = false;
        });
        equationLatex += ` = ${formatSymbolicFractionToLatex(refMatrix[rowIdx][numVars])}`;
        steps.push(equationLatex);
        
        let substitutionSteps = '';
        for (let j = pivotCol + 1; j < numVars; j++) {
            const coeff = refMatrix[rowIdx][j];
            if (!isZeroSF(coeff)) {
                let valToSub: SymbolicFraction;
                if (solvedVars.has(j)) {
                    valToSub = solvedVars.get(j)!;
                    substitutionSteps += `x_{${j+1}} = ${formatSymbolicFractionToLatex(valToSub)}, `;
                } else { // It must be a free variable
                    valToSub = { numerator: [{ coefficient: ONE_F, variables: { [`c_${j+1}`]: 1 } }], denominator: ONE_POLY };
                }
                rhs = subtractSF(rhs, multiplySF(coeff, valToSub));
            }
        }
        if (substitutionSteps) {
             steps.push(`\\quad \\text{Substitute known variables: } ${substitutionSteps.slice(0,-2)}`);
        }

        const solution = divideSF(rhs, pivotCoeff);
        solvedVars.set(pivotCol, solution);
        steps.push(`\\quad \\implies ${formatSymbolicFractionToLatex(pivotCoeff)} x_{${pivotCol + 1}} = ${formatSymbolicFractionToLatex(rhs)} \\implies x_{${pivotCol + 1}} = ${formatSymbolicFractionToLatex(solution)}`);
    }

    steps.push(`\\text{4. Construct the final solution vector:}`);
    const particularSolution: SymbolicFraction[] = Array(numVars).fill(ZERO_SF);
    
    const { basis: rrefHomogeneousBasis } = calculateNullSpace(coeffMatrix, true); 
    pivotVarIndices.forEach(p => {
        const sol = solvedVars.get(p)!;
        particularSolution[p] = { numerator: sol.numerator.filter(t => Object.keys(t.variables).length === 0), denominator: sol.denominator };
    });
    
    steps.push(buildSolutionVectorLatex(numVars, particularSolution, rrefHomogeneousBasis, freeVarNames.map(v => v.replace('x', 'c'))));
    return steps;
}


// #endregion

// #region Inverse and Cramer's Rule

const getDeterminantDetails = (matrix: ValidMatrix, isSummarized: boolean): { detResult: DeterminantResult, conditions: SymbolicFraction[] } => {
    const cofactorRes = determinantByCofactor(matrix, isSummarized);
    const rowOpRes = determinantByRowOps(matrix);
    
    const detResult: DeterminantResult = {
        value: rowOpRes.det,
        cofactorSteps: cofactorRes.steps,
        rowOpSteps: rowOpRes.steps,
        rowOpFinalCalculation: rowOpRes.finalCalc,
        summaryMessage: cofactorRes.summaryMessage
    };
    return { detResult, conditions: rowOpRes.conditions };
};

const getInverseDetails = (matrix: ValidMatrix, detA: SymbolicFraction, isSummarized: boolean): { inverse: InverseResult, conditions: SymbolicFraction[] } => {
    if (isZeroSF(detA)) {
        return { inverse: { exists: false, reason: "The determinant of the matrix is 0, so the inverse does not exist." }, conditions: [] };
    }
    const n = matrix.length;
    const augmentedMatrix: ValidMatrix = matrix.map((row, i) => [...row, ...identityMatrix(n)[i]]);
    
    const { steps: gjSteps, finalMatrix, conditions: gjConditions, summaryMessage } = gaussJordanElimination(augmentedMatrix, n, isSummarized);
    
    const inverseMatrix = finalMatrix.map(row => row.slice(n));

    const uniqueInverseConditions: SymbolicFraction[] = [];
    gjConditions.forEach(c => { if (!uniqueInverseConditions.some(ec => areSFEqual(ec,c))) uniqueInverseConditions.push(c); });

    if (isSummarized) {
        return {
            inverse: {
                exists: true,
                inverseMatrix: inverseMatrix,
                gaussJordanSteps: undefined,
                adjointMethod: undefined,
                verification: undefined,
                summaryMessage: summaryMessage
            },
            conditions: uniqueInverseConditions
        };
    }

    const gaussJordanSteps = [{ operation: 'Start with [A|I]', matrix: augmentedMatrix }, ...gjSteps];
    
    const {cofactorMatrix, cofactorSteps, summaryMessage: adjointSummary} = calculateCofactorMatrix(matrix, false);
    const adjointMatrix = transpose(cofactorMatrix);
    const invDet = divideSF(ONE_SF, detA);
    const inverseMatrixAdjoint = adjointMatrix.map(row => row.map(cell => multiplySF(invDet, cell)));
    
    const adjointMethod: AdjointMethodResult = {
        determinantOfA: detA,
        cofactorMatrix,
        cofactorSteps,
        adjointMatrix,
        inverseMatrix: inverseMatrixAdjoint,
        summaryMessage: adjointSummary
    };
    
    const a_times_ainv = multiplyMatricesWithDetails(matrix, inverseMatrix);
    const ainv_times_a = multiplyMatricesWithDetails(inverseMatrix, matrix);
    const verification = { a_times_ainv, ainv_times_a };

    const inverse = {
        exists: true,
        inverseMatrix: inverseMatrix,
        gaussJordanSteps: gaussJordanSteps,
        adjointMethod,
        verification,
        summaryMessage,
    };
    
    return { inverse, conditions: uniqueInverseConditions };
}

function calculateCofactorMatrix(matrix: ValidMatrix, isSummarized: boolean): { cofactorMatrix: ValidMatrix, cofactorSteps: CofactorStep[], summaryMessage?: string } {
    const n = matrix.length;
    if (isSummarized) {
        return {
            cofactorMatrix: [],
            cofactorSteps: [],
            summaryMessage: `Calculating the full cofactor matrix is computationally expensive and was skipped for the initial calculation.`
        }
    }
    const cofactorMatrix: ValidMatrix = [];
    const cofactorSteps: CofactorStep[] = [];
    for (let i = 0; i < n; i++) {
        cofactorMatrix[i] = [];
        for (let j = 0; j < n; j++) {
            const minor = getMinor(matrix, i, j);
            const { det: minorDet } = determinantByCofactor(minor, false);
            const sign = (i + j) % 2 === 0 ? ONE_SF : negateSF(ONE_SF);
            const cofactor = multiplySF(sign, minorDet);
            cofactorMatrix[i][j] = cofactor;
            cofactorSteps.push({
                position: `C_{${i+1}${j+1}}`,
                calculation: `C_{${i+1}${j+1}} = (-1)^{${i+1}+${j+1}} \\det${formatMatrixToLatex(minor)} = ${formatSymbolicFractionToLatex(cofactor)}`
            });
        }
    }
    return { cofactorMatrix, cofactorSteps };
}

export function calculateCramersRule(coeffMatrix: ValidMatrix, bVector: SymbolicFraction[], isSummarized?: boolean): CramersRuleResult {
    if (coeffMatrix.length !== coeffMatrix[0].length) {
        return { isApplicable: false, reason: "The coefficient matrix must be square." };
    }
    if (coeffMatrix.length !== bVector.length) {
        return { isApplicable: false, reason: "The number of rows in the matrix must match the number of entries in the 'b' vector." };
    }
     if (isSummarized) {
        return { isApplicable: true, summaryMessage: `Cramer's rule is computationally expensive and was skipped for the initial calculation.` };
    }

    const { det: detA, steps: stepsA } = determinantByCofactor(coeffMatrix, false);

    if (isZeroSF(detA)) {
        return { isApplicable: false, reason: `The determinant of the coefficient matrix is 0 (${formatSymbolicFractionToLatex(detA)}), so Cramer's rule cannot be used.` };
    }

    const n = coeffMatrix.length;
    const variableSolutions = [];

    for (let i = 0; i < n; i++) {
        const matrixAi = cloneMatrix(coeffMatrix);
        for (let j = 0; j < n; j++) {
            matrixAi[j][i] = bVector[j];
        }
        const { det: detAi, steps: stepsAi } = determinantByCofactor(matrixAi, false);
        const solution = divideSF(detAi, detA);
        
        variableSolutions.push({
            variableName: `x_{${i+1}}`,
            matrixAi,
            determinantOfAi: detAi,
            determinantStepsAi: stepsAi,
            finalCalculation: `x_{${i+1}} = \\frac{\\det(A_{${i+1}})}{\\det(A)} = \\frac{${formatSymbolicFractionToLatex(detAi)}}{${formatSymbolicFractionToLatex(detA)}} = ${formatSymbolicFractionToLatex(solution)}`
        });
    }

    return {
        isApplicable: true,
        determinantOfA: detA,
        determinantStepsA: stepsA,
        variableSolutions
    };
}
// #endregion

// #region Matrix Operations Mode
const precedence: { [key: string]: number } = { '+': 1, '-': 1, '*': 2, '^': 3 };
const EXPRESSION_CACHE_LIMIT = 200;
const rpnCache = createLruCache<string[]>(EXPRESSION_CACHE_LIMIT);
const builderCache = createLruCache<OperationNode[]>(EXPRESSION_CACHE_LIMIT);

export const normalizeExpression = (expression: string): string => expression.replace(/\s+/g, '').toUpperCase();

export const validateExpression = (
    expression: string,
    matrixDefs: Record<string, { rows: number | ''; cols: number | '' }>
): { normalizedExpression: string; errors: string[]; referencedMatrices: string[] } => {
    const normalizedExpression = normalizeExpression(expression);
    const errors: string[] = [];
    const referencedMatrices: string[] = [];

    if (!normalizedExpression) {
        errors.push('Expression is empty.');
        return { normalizedExpression, errors, referencedMatrices };
    }

    const tokens = normalizedExpression.match(/[A-Z]+|\d+|[\^\*\+\-\(\)]/g) || [];
    if (tokens.join('') !== normalizedExpression) {
        errors.push('Expression contains invalid characters.');
    }

    let parenDepth = 0;
    let expectOperand = true;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const prev = tokens[i - 1];
        const next = tokens[i + 1];
        const isMatrix = /^[A-Z]+$/.test(token);
        const isNumber = /^\d+$/.test(token);
        const isOperator = token in precedence;

        if (token === '(') {
            if (!expectOperand) errors.push('Missing operator before "(".');
            parenDepth += 1;
            continue;
        }
        if (token === ')') {
            if (expectOperand) errors.push('Missing operand before ")".');
            parenDepth -= 1;
            if (parenDepth < 0) errors.push('Mismatched parentheses.');
            continue;
        }

        if (expectOperand) {
            if (isMatrix) {
                if (!referencedMatrices.includes(token)) referencedMatrices.push(token);
                if (!matrixDefs[token]) errors.push(`Matrix ${token} is not defined.`);
                expectOperand = false;
            } else if (isNumber) {
                if (prev !== '^') {
                    errors.push('Exponent must follow "^".');
                }
                const exponent = parseInt(token, 10);
                if (!Number.isInteger(exponent) || exponent < 1) {
                    errors.push('Exponent must be a positive integer.');
                }
                expectOperand = false;
            } else {
                errors.push(`Unexpected token "${token}".`);
            }
        } else {
            if (isOperator) {
                if (token === '^') {
                    if (!next || !/^\d+$/.test(next)) {
                        errors.push('Exponent must be a number after "^".');
                    }
                }
                expectOperand = true;
            } else {
                errors.push(`Missing operator before "${token}".`);
            }
        }
    }

    if (parenDepth !== 0) errors.push('Mismatched parentheses.');
    if (expectOperand) errors.push('Expression ends with an operator.');

    return { normalizedExpression, errors, referencedMatrices };
};

const parseExpressionToRPN = (expression: string): string[] => {
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];
    const tokens = expression.match(/[A-Z]+|\d+|[\^\*\+\-\(\)]/g);
    if (!tokens) throw new Error("Invalid expression. Could not tokenize.");

    tokens.forEach(token => {
        if (/[A-Z]/.test(token)) { // Matrix name
            outputQueue.push(token);
        } else if (/\d+/.test(token)) { // Number (for exponent)
            outputQueue.push(token);
        } else if (token in precedence) { // Operator
            while (
                operatorStack.length > 0 &&
                operatorStack[operatorStack.length - 1] !== '(' &&
                ( (precedence[operatorStack[operatorStack.length - 1]] > precedence[token]) || 
                  (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && token !== '^') )
            ) {
                outputQueue.push(operatorStack.pop()!);
            }
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                outputQueue.push(operatorStack.pop()!);
            }
            if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] === '(') {
                operatorStack.pop();
            } else {
                throw new Error("Mismatched parentheses.");
            }
        }
    });

    while (operatorStack.length > 0) {
        const op = operatorStack.pop()!;
        if (op === '(') throw new Error("Mismatched parentheses.");
        outputQueue.push(op);
    }
    return outputQueue;
};

const getCachedRpn = (expression: string): string[] => {
    const normalized = normalizeExpression(expression);
    const cached = rpnCache.get(normalized);
    if (cached) return [...cached];
    const rpn = parseExpressionToRPN(normalized);
    rpnCache.set(normalized, rpn);
    return [...rpn];
};

type RPNStackItem = {
    matrix: ValidMatrix;
    name: string;
} | number;

const evaluateRPN = (rpn: string[], matrices: Map<string, ValidMatrix>, options: CalculationOptions): MatrixOperationsResult => {
    const stack: RPNStackItem[] = [];
    const steps: MatrixOperationStep[] = [];
    const conditions: SymbolicFraction[] = [];

    rpn.forEach((token) => {
        if (/[A-Z]/.test(token)) {
            const matrix = matrices.get(token);
            if (!matrix) throw new Error(`Matrix ${token} is not defined.`);
            stack.push({ matrix, name: token });
        } else if (/\d+/.test(token)) {
            stack.push(parseInt(token, 10));
        } else {
            let result: MatrixMultiplicationDetail;
            let operation: string;
            
            const bItem = stack.pop();
            const aItem = stack.pop();
            
            if (bItem === undefined || aItem === undefined) throw new Error("Invalid expression syntax.");
            
            const showDetails = !options.summarized;

            if (token === '^') {
                const exponent = bItem as number;
                const base = aItem as { matrix: ValidMatrix, name: string };
                if (typeof exponent !== 'number' || typeof base === 'number') throw new Error("Invalid expression for exponentiation.");
                 if (exponent < 1) throw new Error("Exponent must be a positive integer.");
                 if (base.matrix.length !== base.matrix[0].length) throw new Error(`Matrix ${base.name} must be square for exponentiation.`);

                if (exponent === 1) {
                    stack.push(base); 
                    return; 
                }
                
                let currentResult = base.matrix;
                let currentName = base.name;
                
                const firstMult = multiplyMatricesWithDetails(base.matrix, base.matrix);
                steps.push({
                    operation: `${base.name}^{2} = ${base.name} \\times ${base.name}`,
                    result: firstMult.product,
                    details: showDetails ? firstMult : undefined
                });
                currentResult = firstMult.product;
                currentName = `${base.name}^{2}`;
                
                for (let i = 2; i < exponent; i++) {
                    const nextMult = multiplyMatricesWithDetails(currentResult, base.matrix);
                    const newOpName = `(${currentName} \\times ${base.name})`;
                    steps.push({
                        operation: `${base.name}^{${i + 1}} = ${newOpName}`,
                        result: nextMult.product,
                        details: showDetails ? nextMult : undefined
                    });
                    currentResult = nextMult.product;
                    currentName = `${base.name}^{${i + 1}}`;
                }
                stack.push({ matrix: currentResult, name: `${base.name}^{${exponent}}` });

            } else {
                const b = bItem as { matrix: ValidMatrix, name: string };
                const a = aItem as { matrix: ValidMatrix, name: string };
                if (typeof a === 'number' || typeof b === 'number') throw new Error("Invalid expression for arithmetic operation.");

                if (token === '+') {
                    result = addMatricesWithDetails(a.matrix, b.matrix);
                    operation = `(${a.name} + ${b.name})`;
                } else if (token === '-') {
                    result = subtractMatricesWithDetails(a.matrix, b.matrix);
                    operation = `(${a.name} - ${b.name})`;
                } else if (token === '*') {
                    result = multiplyMatricesWithDetails(a.matrix, b.matrix);
                    operation = `(${a.name} \\times ${b.name})`;
                } else {
                    throw new Error(`Unknown operator: ${token}`);
                }
                steps.push({ operation, result: result.product, details: showDetails ? result : undefined });
                stack.push({ matrix: result.product, name: operation });
            }
        }
    });

    if (stack.length !== 1 || typeof stack[0] === 'number') throw new Error("Invalid expression evaluation stack.");
    const finalResult = (stack[0] as { matrix: ValidMatrix }).matrix;
    
    return { steps, finalResult, conditions };
};

export const calculateMatrixOperations = (expression: string, matrices: Map<string, ValidMatrix>, options: CalculationOptions): MatrixOperationsResult => {
    const rpn = getCachedRpn(expression);
    return evaluateRPN(rpn, matrices, options);
};
// #endregion

// #region On-Demand Detail Calculation
type AllResultTypes = CalculationResult | MatrixOperationsResult;
type OriginalInputs = {
    matrix?: ValidMatrix;
    systemType?: SystemType;
    bVector?: SymbolicFraction[];
    expression?: string;
    matrices?: Map<string, ValidMatrix>;
}

export const recalculateDetailsForSection = (
    currentResults: AllResultTypes,
    section: string,
    originalInputs: OriginalInputs,
    appMode: AppMode
): AllResultTypes => {
    const newResults = JSON.parse(JSON.stringify(currentResults)); // Deep clone

    if (appMode === 'systemSolver') {
        const calcResults = newResults as CalculationResult;
        const { matrix, systemType } = originalInputs;
        if (!matrix) throw new Error("Original matrix not provided for detail recalculation.");
        const coeffMatrix = systemType === 'non-homogeneous' ? matrix.map(row => row.slice(0, -1)) : matrix;

        if (section === "Row Echelon Form (REF)" || section === "Reduced Row Echelon Form (RREF)") {
            const { steps, summaryMessage } = gaussJordanElimination(matrix, coeffMatrix[0].length, false);
            calcResults.gaussJordanSteps = [{operation: 'Initial Matrix', matrix: matrix}, ...steps];
            calcResults.summaryMessage = summaryMessage;
        } else if (section === "Determinant") {
            const { detResult } = getDeterminantDetails(coeffMatrix, false);
            calcResults.determinant = detResult;
        } else if (section === "Matrix Inverse") {
            const det = calcResults.determinant?.value;
            if (!det) throw new Error("Determinant must be calculated before inverse details.");
            const { inverse } = getInverseDetails(coeffMatrix, det, false);
            calcResults.inverse = inverse;
        } else if (section === "Cramer's Rule") {
             const payloadBVector = (originalInputs.bVector as any)?.bVector;
             const bVector = payloadBVector || (systemType === 'non-homogeneous' ? matrix.map(row => row[row.length - 1]) : null);

             if (!bVector) {
                 throw new Error("b-vector not available for Cramer's Rule detail recalculation.");
             }
             calcResults.cramersRule = calculateCramersRule(coeffMatrix, bVector, false);
        } else if (section === "Null Space (Kernel)") {
             const { finalMatrix: rref } = gaussJordanElimination(matrix, coeffMatrix[0].length, true);
             calcResults.nullSpace = calculateNullSpace(rref.map(r => r.slice(0, coeffMatrix[0].length)), false);
        } else if (section.startsWith("Solution Set")) {
             const { finalMatrix: rref, refMatrix } = gaussJordanElimination(matrix, coeffMatrix[0].length, true);
             if (systemType === 'homogeneous') {
                 calcResults.homogeneousSolutionSet = generateHomogeneousSolutionSet(rref, calcResults.conditions, false);
             } else {
                 const { solutionSetRef, solutionSetRref } = generateNonHomogeneousSolutionSets(refMatrix, rref, calcResults.conditions, false);
                 calcResults.solutionSetRef = solutionSetRef;
                 calcResults.solutionSetRref = solutionSetRref;
             }
        }
    } else { // Matrix Ops
        const { expression, matrices } = originalInputs;
        if (!expression || !matrices) throw new Error("Original expression/matrices not provided for detail recalculation.");
        
        if (appMode === 'matrixOperations') {
             const opsResults = newResults as MatrixOperationsResult;
             const detailedOps = calculateMatrixOperations(expression, matrices, { summarized: false });
             opsResults.steps = detailedOps.steps;
        }
    }
    
    return newResults;
};
// #endregion

// #region Operation Builder Service
type Dimensions = { rows: number; cols: number; };

export const getOperationResultDimensions = (
    op: OperationNode['operation'],
    leftDims: Dimensions,
    rightDims: Dimensions | number
): { dims: Dimensions; error: string | null } => {
    try {
        if (op === '+' || op === '-') {
            if (typeof rightDims === 'number' || leftDims.rows !== rightDims.rows || leftDims.cols !== rightDims.cols) {
                throw new Error("Matrices must have the same dimensions for addition/subtraction.");
            }
            return { dims: leftDims, error: null };
        }
        if (op === '*') {
            // FIX: Split the conditional to correctly handle the case where rightDims is a number.
            // The original code caused a type error by attempting to access `.rows` on a number
            // within the error message string.
            if (typeof rightDims === 'number') {
                throw new Error("Cannot multiply a matrix by a scalar using the '*' operator.");
            }
            if (leftDims.cols !== rightDims.rows) {
                throw new Error(`Inner dimensions must match for multiplication (${leftDims.cols} vs ${rightDims.rows}).`);
            }
            return { dims: { rows: leftDims.rows, cols: rightDims.cols }, error: null };
        }
        if (op === '^') {
            const exp = typeof rightDims === 'number' ? rightDims : parseInt(String(rightDims), 10);
            if (isNaN(exp) || exp < 1 || !Number.isInteger(exp)) {
                 throw new Error("Exponent must be a positive integer.");
            }
            if (leftDims.rows !== leftDims.cols) {
                throw new Error("Matrix must be square for exponentiation.");
            }
            return { dims: leftDims, error: null };
        }
    } catch (e) {
        if (e instanceof Error) return { dims: { rows: 0, cols: 0 }, error: e.message };
    }
    return { dims: { rows: 0, cols: 0 }, error: "Unknown operation." };
};

export const builderNodesToExpression = (nodes: OperationNode[]): string => {
    if (nodes.length === 0) return '';
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const getOperandExpression = (operand: Operand | null): { expr: string; prec: number } => {
        if (!operand) return { expr: '?', prec: 99 };
        if (operand.type === 'matrix') return { expr: operand.value, prec: 99 };
        if (operand.type === 'number') return { expr: operand.value, prec: 99 };
        if (operand.type === 'result') return getNodeExpression(operand.value);
        return { expr: '?', prec: 99 };
    };

    const getNodeExpression = (nodeId: string): { expr: string; prec: number } => {
        const node = nodeMap.get(nodeId);
        // A node is incomplete if it doesn't exist or is missing operands.
        if (!node || !node.left || !node.right) return { expr: '?', prec: 99 };

        const left = getOperandExpression(node.left);
        const right = getOperandExpression(node.right);
        
        // If any sub-expression is invalid, this one is too.
        if (left.expr === '?' || right.expr === '?') {
            return { expr: '?', prec: 99 };
        }

        const opPrec = precedence[node.operation];
        const leftExpr = left.prec < opPrec ? `(${left.expr})` : left.expr;
        const rightExpr = right.prec <= opPrec && node.operation !== '^' ? `(${right.expr})` : right.expr;

        return { expr: `${leftExpr} ${node.operation} ${rightExpr}`, prec: opPrec };
    };
    
    // Find the expression of the last valid (complete) node by iterating backwards.
    for (let i = nodes.length - 1; i >= 0; i--) {
        const exprResult = getNodeExpression(nodes[i].id);
        if (exprResult.expr !== '?') {
            return exprResult.expr;
        }
    }
    
    return ''; // Return empty string if no valid expression can be formed.
};


export const expressionToBuilderNodes = (expression: string): OperationNode[] => {
    const normalizedExpression = normalizeExpression(expression);
    if (!normalizedExpression) return [];
    const cached = builderCache.get(normalizedExpression);
    if (cached) return JSON.parse(JSON.stringify(cached)) as OperationNode[];
    try {
        const rpn = getCachedRpn(normalizedExpression);
        const stack: Operand[] = [];
        const nodes: OperationNode[] = [];
        let tempIdCounter = 0;

        rpn.forEach(token => {
            if (/[A-Z]/.test(token)) {
                stack.push({ type: 'matrix', value: token });
            } else if (/\d+/.test(token)) {
                stack.push({ type: 'number', value: token });
            } else {
                const right = stack.pop();
                const left = stack.pop();
                if (!left || !right) throw new Error("Invalid expression syntax.");
                
                const id = `T${++tempIdCounter}`;
                const newNode: OperationNode = {
                    id,
                    operation: token as any,
                    left,
                    right,
                    resultName: `Step ${tempIdCounter}`,
                };
                nodes.push(newNode);
                stack.push({ type: 'result', value: id });
            }
        });
        
        if (nodes.length > 0) {
            nodes[nodes.length - 1].resultName = 'Final Result';
        }

        builderCache.set(normalizedExpression, nodes);
        return JSON.parse(JSON.stringify(nodes)) as OperationNode[];
    } catch (e) {
        console.error("Failed to parse expression into nodes:", e);
        return [];
    }
};

// #endregion

// #region Numeric Conversion & Analysis

export type NumericMatrix = number[][];

const EPSILON = 1e-10;

const cloneNumericMatrix = (m: NumericMatrix): NumericMatrix => m.map(row => [...row]);

const createZeroMatrix = (rows: number, cols: number): NumericMatrix =>
    Array.from({ length: rows }, () => Array(cols).fill(0));

const createIdentityMatrix = (n: number): NumericMatrix => {
    const m = createZeroMatrix(n, n);
    for (let i = 0; i < n; i++) m[i][i] = 1;
    return m;
};

const transposeNumeric = (m: NumericMatrix): NumericMatrix => {
    const rows = m.length;
    const cols = rows > 0 ? m[0].length : 0;
    const t = createZeroMatrix(cols, rows);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            t[c][r] = m[r][c];
        }
    }
    return t;
};

const multiplyNumeric = (a: NumericMatrix, b: NumericMatrix): NumericMatrix => {
    const rows = a.length;
    const mid = rows > 0 ? a[0].length : 0;
    const cols = b.length > 0 ? b[0].length : 0;
    const result = createZeroMatrix(rows, cols);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let sum = 0;
            for (let k = 0; k < mid; k++) {
                sum += a[r][k] * b[k][c];
            }
            result[r][c] = sum;
        }
    }
    return result;
};

const dotNumeric = (a: number[], b: number[]): number => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
};

const normNumeric = (v: number[]): number => Math.sqrt(dotNumeric(v, v));

const polyToNumber = (poly: Polynomial): number | null => {
    let sum = 0;
    for (const term of poly) {
        if (Object.keys(term.variables).length > 0) return null;
        sum += term.coefficient.numerator / term.coefficient.denominator;
    }
    return sum;
};

export const symbolicFractionToNumber = (sf: SymbolicFraction): number | null => {
    const numerator = polyToNumber(sf.numerator);
    const denominator = polyToNumber(sf.denominator);
    if (numerator === null || denominator === null) return null;
    if (Math.abs(denominator) < EPSILON) return null;
    return numerator / denominator;
};

export const toNumericMatrix = (matrix: ValidMatrix): NumericMatrix => {
    return matrix.map(row => row.map(cell => {
        const value = symbolicFractionToNumber(cell);
        if (value === null) {
            throw new Error("Numeric mode requires all matrix entries to be numeric constants.");
        }
        return value;
    }));
};

const roundNumber = (value: number, digits = 6): number => {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
};

const DEFAULT_FORMAT_OPTIONS: Required<NumberFormatOptions> = {
    digits: 6,
    mode: 'fixed',
    fractionMaxDenominator: 1000
};

const formatFraction = (value: number, maxDenominator: number): { numerator: number; denominator: number } => {
    if (!Number.isFinite(value)) return { numerator: 0, denominator: 1 };
    const sign = value < 0 ? -1 : 1;
    let x = Math.abs(value);
    if (Math.abs(x - Math.round(x)) < 1e-10) {
        return { numerator: sign * Math.round(x), denominator: 1 };
    }

    let a = Math.floor(x);
    let h1 = 1, k1 = 0;
    let h = a, k = 1;

    while (k <= maxDenominator) {
        const frac = x - a;
        if (frac < 1e-12) break;
        x = 1 / frac;
        a = Math.floor(x);
        const h2 = h1; const k2 = k1;
        h1 = h; k1 = k;
        h = a * h1 + h2;
        k = a * k1 + k2;
        if (k > maxDenominator) break;
    }

    return { numerator: sign * h, denominator: k };
};

const formatNumber = (value: number, options?: NumberFormatOptions, latex = true): string => {
    const { digits, mode, fractionMaxDenominator } = { ...DEFAULT_FORMAT_OPTIONS, ...(options || {}) };
    if (!Number.isFinite(value)) return latex ? '\\text{NaN}' : 'NaN';

    if (mode === 'auto') {
        const absValue = Math.abs(value);
        let autoDigits = Math.max(2, Math.min(6, digits));
        if (absValue >= 1000) autoDigits = Math.min(autoDigits, 4);
        if (absValue !== 0 && (absValue >= 1e6 || absValue < 1e-4)) {
            return formatNumber(value, { ...options, mode: 'scientific', digits: autoDigits }, latex);
        }
        return formatNumber(value, { ...options, mode: 'fixed', digits: autoDigits }, latex);
    }

    if (mode === 'fraction') {
        const { numerator, denominator } = formatFraction(value, fractionMaxDenominator);
        if (denominator === 1) return String(numerator);
        return latex ? `\\frac{${numerator}}{${denominator}}` : `${numerator}/${denominator}`;
    }

    if (mode === 'scientific') {
        const precision = Math.max(1, digits);
        const exp = value.toExponential(precision - 1);
        if (!latex) return exp.replace(/e\+?/, 'e');
        const [coeff, exponent] = exp.split('e');
        const expNum = exponent ? exponent.replace('+', '') : '0';
        return `${coeff}\\times 10^{${expNum}}`;
    }

    const rounded = roundNumber(value, digits);
    const str = rounded.toFixed(digits).replace(/\.?0+$/, '');
    const normalized = str === '-0' ? '0' : str;
    return normalized;
};

export const formatNumberToLatex = (value: number, options?: NumberFormatOptions): string => {
    return formatNumber(value, options, true);
};

export const formatNumberToString = (value: number, options?: NumberFormatOptions): string => {
    return formatNumber(value, options, false);
};

export const formatNumericMatrixToLatex = (m: NumericMatrix, options?: NumberFormatOptions): string => {
    const body = m.map(row => row.map(v => formatNumberToLatex(v, options)).join(' & ')).join(' \\\\ ');
    return `\\begin{bmatrix} ${body} \\end{bmatrix}`;
};

export const formatNumericMatrixToCsv = (m: NumericMatrix, options?: NumberFormatOptions): string => {
    return m.map(row => row.map(v => formatNumberToString(v, options)).join(',')).join('\n');
};

export const calculateTrace = (matrix: ValidMatrix): SymbolicFraction => {
    const size = Math.min(matrix.length, matrix[0]?.length || 0);
    let sum = ZERO_SF;
    for (let i = 0; i < size; i++) {
        sum = addSF(sum, matrix[i][i]);
    }
    return sum;
};

export const calculateRank = (matrix: ValidMatrix): number => {
    const pivotColumnCount = matrix[0]?.length || 0;
    const { pivotColumns } = gaussJordanElimination(matrix, pivotColumnCount, true);
    return pivotColumns.length;
};

export const numericRank = (matrix: NumericMatrix, eps = EPSILON): number => {
    const m = cloneNumericMatrix(matrix);
    const rows = m.length;
    const cols = rows > 0 ? m[0].length : 0;
    let rank = 0;
    let pivotRow = 0;

    for (let pivotCol = 0; pivotCol < cols && pivotRow < rows; pivotCol++) {
        let bestRow = pivotRow;
        let bestValue = Math.abs(m[pivotRow][pivotCol]);
        for (let r = pivotRow + 1; r < rows; r++) {
            const value = Math.abs(m[r][pivotCol]);
            if (value > bestValue) {
                bestValue = value;
                bestRow = r;
            }
        }
        if (bestValue <= eps) continue;
        if (bestRow !== pivotRow) {
            const temp = m[pivotRow];
            m[pivotRow] = m[bestRow];
            m[bestRow] = temp;
        }
        const pivotVal = m[pivotRow][pivotCol];
        for (let r = pivotRow + 1; r < rows; r++) {
            const factor = m[r][pivotCol] / pivotVal;
            for (let c = pivotCol; c < cols; c++) {
                m[r][c] -= factor * m[pivotRow][c];
            }
        }
        rank++;
        pivotRow++;
    }

    return rank;
};

export const numericTrace = (matrix: NumericMatrix): number => {
    const size = Math.min(matrix.length, matrix[0]?.length || 0);
    let sum = 0;
    for (let i = 0; i < size; i++) sum += matrix[i][i];
    return sum;
};

export const numericNorm1 = (matrix: NumericMatrix): number => {
    const cols = matrix[0]?.length ?? 0;
    let max = 0;
    for (let c = 0; c < cols; c++) {
        let sum = 0;
        for (let r = 0; r < matrix.length; r++) {
            sum += Math.abs(matrix[r]?.[c] ?? 0);
        }
        max = Math.max(max, sum);
    }
    return max;
};

export const numericNormInf = (matrix: NumericMatrix): number => {
    let max = 0;
    for (const row of matrix) {
        const sum = row.reduce((acc, v) => acc + Math.abs(v), 0);
        max = Math.max(max, sum);
    }
    return max;
};

export const numericNormFro = (matrix: NumericMatrix): number => {
    let sumSq = 0;
    for (const row of matrix) {
        for (const v of row) sumSq += v * v;
    }
    return Math.sqrt(sumSq);
};

export const numericNorm2 = (svd?: { singularValues: number[] }): number | undefined => {
    if (!svd || svd.singularValues.length === 0) return undefined;
    return Math.max(...svd.singularValues);
};

export const numericLU = (matrix: NumericMatrix, eps = EPSILON): { L: NumericMatrix; U: NumericMatrix; P: NumericMatrix; pivotSign: number } => {
    const n = matrix.length;
    const U = cloneNumericMatrix(matrix);
    const L = createIdentityMatrix(n);
    const P = createIdentityMatrix(n);
    let pivotSign = 1;

    for (let i = 0; i < n; i++) {
        let pivotRow = i;
        let pivotValue = Math.abs(U[i][i]);
        for (let r = i + 1; r < n; r++) {
            const value = Math.abs(U[r][i]);
            if (value > pivotValue) {
                pivotValue = value;
                pivotRow = r;
            }
        }

        if (pivotValue <= eps) continue;

        if (pivotRow !== i) {
            [U[i], U[pivotRow]] = [U[pivotRow], U[i]];
            [P[i], P[pivotRow]] = [P[pivotRow], P[i]];
            for (let c = 0; c < i; c++) {
                [L[i][c], L[pivotRow][c]] = [L[pivotRow][c], L[i][c]];
            }
            pivotSign *= -1;
        }

        for (let r = i + 1; r < n; r++) {
            const factor = U[r][i] / U[i][i];
            L[r][i] = factor;
            for (let c = i; c < n; c++) {
                U[r][c] -= factor * U[i][c];
            }
        }
    }

    return { L, U, P, pivotSign };
};

export const numericDeterminant = (matrix: NumericMatrix): number => {
    if (matrix.length !== matrix[0]?.length) throw new Error('Determinant requires a square matrix.');
    const { U, pivotSign } = numericLU(matrix);
    let det = pivotSign;
    for (let i = 0; i < U.length; i++) {
        det *= U[i][i] ?? 0;
    }
    return det;
};

export const numericQR = (matrix: NumericMatrix, eps = EPSILON): { Q: NumericMatrix; R: NumericMatrix } => {
    const rows = matrix.length;
    const cols = rows > 0 ? matrix[0].length : 0;
    const Q = createZeroMatrix(rows, cols);
    const R = createZeroMatrix(cols, cols);

    for (let k = 0; k < cols; k++) {
        const v = Array(rows).fill(0).map((_, i) => matrix[i][k]);

        for (let j = 0; j < k; j++) {
            const qCol = Q.map(row => row[j]);
            R[j][k] = dotNumeric(qCol, v);
            for (let i = 0; i < rows; i++) v[i] -= R[j][k] * qCol[i];
        }

        const norm = normNumeric(v);
        R[k][k] = norm;
        if (norm > eps) {
            for (let i = 0; i < rows; i++) Q[i][k] = v[i] / norm;
        }
    }

    return { Q, R };
};

const isSymmetricNumeric = (matrix: NumericMatrix, eps = EPSILON): boolean => {
    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > eps) return false;
        }
    }
    return true;
};

export const numericEigenSymmetric = (matrix: NumericMatrix, maxIterations = 100, eps = EPSILON): { values: number[]; vectors: NumericMatrix; iterations: number; converged: boolean } => {
    const n = matrix.length;
    const a = cloneNumericMatrix(matrix);
    const v = createIdentityMatrix(n);
    let converged = false;

    const maxIndex = (): { p: number; q: number; value: number } => {
        let maxVal = 0;
        let p = 0;
        let q = 1;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const val = Math.abs(a[i][j]);
                if (val > maxVal) {
                    maxVal = val;
                    p = i;
                    q = j;
                }
            }
        }
        return { p, q, value: maxVal };
    };

    let iterations = 0;
    for (iterations = 0; iterations < maxIterations; iterations++) {
        const { p, q, value } = maxIndex();
        if (value <= eps) {
            converged = true;
            break;
        }

        const app = a[p][p];
        const aqq = a[q][q];
        const apq = a[p][q];
        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi);
        const s = Math.sin(phi);

        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                const aip = a[i][p];
                const aiq = a[i][q];
                a[i][p] = c * aip - s * aiq;
                a[p][i] = a[i][p];
                a[i][q] = s * aip + c * aiq;
                a[q][i] = a[i][q];
            }
        }

        a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        a[p][q] = 0;
        a[q][p] = 0;

        for (let i = 0; i < n; i++) {
            const vip = v[i][p];
            const viq = v[i][q];
            v[i][p] = c * vip - s * viq;
            v[i][q] = s * vip + c * viq;
        }
    }

    const values = a.map((row, i) => row[i]);
    return { values, vectors: v, iterations, converged };
};

export const numericEigen = (matrix: NumericMatrix, maxIterations = 120, eps = EPSILON): { values: number[]; vectors?: NumericMatrix; symmetric: boolean; iterations: number; converged: boolean } => {
    const symmetric = isSymmetricNumeric(matrix, eps);
    if (symmetric) {
        const result = numericEigenSymmetric(matrix, maxIterations, eps);
        return { values: result.values, vectors: result.vectors, symmetric: true, iterations: result.iterations, converged: result.converged };
    }

    let a = cloneNumericMatrix(matrix);
    let converged = false;
    let iterations = 0;

    for (iterations = 0; iterations < maxIterations; iterations++) {
        const { Q, R } = numericQR(a, eps);
        a = multiplyNumeric(R, Q);

        let offDiagNorm = 0;
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < a.length; j++) {
                if (i !== j) offDiagNorm += Math.abs(a[i][j]);
            }
        }
        if (offDiagNorm <= eps) {
            converged = true;
            break;
        }
    }

    const values = a.map((row, i) => row[i]);
    return { values, symmetric: false, iterations, converged };
};

export const numericSVD = (matrix: NumericMatrix, maxIterations = 120, eps = EPSILON): { U: NumericMatrix; S: NumericMatrix; Vt: NumericMatrix; singularValues: number[] } => {
    const rows = matrix.length;
    const cols = rows > 0 ? matrix[0].length : 0;
    const at = transposeNumeric(matrix);
    const ata = multiplyNumeric(at, matrix);

    const eig = numericEigenSymmetric(ata, maxIterations, eps);
    const pairs = eig.values.map((value, index) => ({ value, vector: eig.vectors.map(row => row[index]) }));
    pairs.sort((a, b) => b.value - a.value);

    const singularValues = pairs.map(p => Math.sqrt(Math.max(p.value, 0)));
    const V = createZeroMatrix(cols, cols);
    for (let i = 0; i < cols; i++) {
        const vec = pairs[i]?.vector || Array(cols).fill(0);
        for (let r = 0; r < cols; r++) V[r][i] = vec[r];
    }

    const U = createZeroMatrix(rows, cols);
    for (let i = 0; i < cols; i++) {
        const sigma = singularValues[i];
        if (sigma <= eps) continue;
        const vCol = V.map(row => row[i]);
        const Av = matrix.map(row => dotNumeric(row, vCol));
        for (let r = 0; r < rows; r++) {
            U[r][i] = Av[r] / sigma;
        }
    }

    const S = createZeroMatrix(rows, cols);
    for (let i = 0; i < Math.min(rows, cols); i++) {
        S[i][i] = singularValues[i] || 0;
    }

    const Vt = transposeNumeric(V);
    return { U, S, Vt, singularValues };
};

export const numericIdentity = (n: number): NumericMatrix => createIdentityMatrix(n);

export const numericMatrixInverse = (matrix: NumericMatrix, eps = EPSILON): NumericMatrix => {
    const n = matrix.length;
    const m = cloneNumericMatrix(matrix);
    const inv = createIdentityMatrix(n);

    for (let col = 0; col < n; col++) {
        let pivotRow = col;
        let pivotVal = Math.abs(m[col][col]);
        for (let r = col + 1; r < n; r++) {
            const val = Math.abs(m[r][col]);
            if (val > pivotVal) {
                pivotVal = val;
                pivotRow = r;
            }
        }
        if (pivotVal <= eps) throw new Error('Matrix is singular or ill-conditioned.');
        if (pivotRow !== col) {
            [m[col], m[pivotRow]] = [m[pivotRow], m[col]];
            [inv[col], inv[pivotRow]] = [inv[pivotRow], inv[col]];
        }
        const pivot = m[col][col];
        for (let c = 0; c < n; c++) {
            m[col][c] /= pivot;
            inv[col][c] /= pivot;
        }
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const factor = m[r][col];
            for (let c = 0; c < n; c++) {
                m[r][c] -= factor * m[col][c];
                inv[r][c] -= factor * inv[col][c];
            }
        }
    }
    return inv;
};

export const numericConditionNumber = (matrix: NumericMatrix): number => {
    const svd = numericSVD(matrix);
    const max = Math.max(...svd.singularValues);
    const min = Math.min(...svd.singularValues.filter(v => v > EPSILON));
    if (!Number.isFinite(max) || !Number.isFinite(min) || min <= EPSILON) return Infinity;
    return max / min;
};

export const numericMatrixFunction = (matrix: NumericMatrix, fn: (value: number) => number): NumericMatrix => {
    const eig = numericEigen(matrix);
    if (!eig.vectors) {
        throw new Error('Eigenvectors not available for this matrix.');
    }
    const n = matrix.length;
    const V = eig.vectors;
    const Vinv = numericMatrixInverse(V);
    const D = createZeroMatrix(n, n);
    for (let i = 0; i < n; i++) D[i][i] = fn(eig.values[i]);
    return multiplyNumeric(multiplyNumeric(V, D), Vinv);
};

export const numericMatrixExp = (matrix: NumericMatrix): NumericMatrix => {
    return numericMatrixFunction(matrix, (v) => Math.exp(v));
};

export const numericMatrixSqrt = (matrix: NumericMatrix): NumericMatrix => {
    return numericMatrixFunction(matrix, (v) => {
        if (v < 0) throw new Error('Matrix has negative eigenvalues; sqrt undefined.');
        return Math.sqrt(v);
    });
};

export const numericMatrixLog = (matrix: NumericMatrix): NumericMatrix => {
    return numericMatrixFunction(matrix, (v) => {
        if (v <= 0) throw new Error('Matrix has non-positive eigenvalues; log undefined.');
        return Math.log(v);
    });
};

export const numericJordanForm = (matrix: NumericMatrix): { J: NumericMatrix; P: NumericMatrix; eigenvalues: number[]; warning?: string } => {
    const eig = numericEigen(matrix);
    if (!eig.vectors) {
        return { J: createIdentityMatrix(matrix.length), P: createIdentityMatrix(matrix.length), eigenvalues: eig.values, warning: 'Eigenvectors unavailable; Jordan form approximated as diagonal.' };
    }
    const n = matrix.length;
    const J = createZeroMatrix(n, n);
    for (let i = 0; i < n; i++) J[i][i] = eig.values[i];
    return { J, P: eig.vectors, eigenvalues: eig.values, warning: eig.symmetric ? undefined : 'Non-symmetric matrix; Jordan blocks assumed diagonal.' };
};

export const numericJacobi = (A: NumericMatrix, b: number[], tol = 1e-8, maxIter = 100): { x: number[]; residuals: number[] } => {
    const n = A.length;
    let x = Array(n).fill(0);
    const residuals: number[] = [];
    for (let iter = 0; iter < maxIter; iter++) {
        const next = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j];
            next[i] = (b[i] - sum) / A[i][i];
        }
        x = next;
        const r = A.map((row, i) => row.reduce((acc, v, j) => acc + v * x[j], 0) - b[i]);
        const norm = Math.sqrt(r.reduce((acc, v) => acc + v * v, 0));
        residuals.push(norm);
        if (norm < tol) break;
    }
    return { x, residuals };
};

export const numericGaussSeidel = (A: NumericMatrix, b: number[], tol = 1e-8, maxIter = 100): { x: number[]; residuals: number[] } => {
    const n = A.length;
    const x = Array(n).fill(0);
    const residuals: number[] = [];
    for (let iter = 0; iter < maxIter; iter++) {
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j];
            x[i] = (b[i] - sum) / A[i][i];
        }
        const r = A.map((row, i) => row.reduce((acc, v, j) => acc + v * x[j], 0) - b[i]);
        const norm = Math.sqrt(r.reduce((acc, v) => acc + v * v, 0));
        residuals.push(norm);
        if (norm < tol) break;
    }
    return { x: [...x], residuals };
};

const dotVec = (a: number[], b: number[]) => a.reduce((acc, v, i) => acc + v * b[i], 0);

export const numericConjugateGradient = (A: NumericMatrix, b: number[], tol = 1e-8, maxIter = 200): { x: number[]; residuals: number[] } => {
    const n = A.length;
    let x = Array(n).fill(0);
    let r = b.slice();
    let p = r.slice();
    const residuals: number[] = [];
    let rsold = dotVec(r, r);

    for (let i = 0; i < maxIter; i++) {
        const Ap = A.map(row => dotVec(row, p));
        const alpha = rsold / Math.max(dotVec(p, Ap), EPSILON);
        x = x.map((xi, idx) => xi + alpha * p[idx]);
        r = r.map((ri, idx) => ri - alpha * Ap[idx]);
        const rsnew = dotVec(r, r);
        residuals.push(Math.sqrt(rsnew));
        if (Math.sqrt(rsnew) < tol) break;
        p = r.map((ri, idx) => ri + (rsnew / rsold) * p[idx]);
        rsold = rsnew;
    }
    return { x, residuals };
};

export const numericGMRES = (A: NumericMatrix, b: number[], tol = 1e-8, maxIter = 50): { x: number[]; residuals: number[] } => {
    const n = A.length;
    let x = Array(n).fill(0);
    let r0 = b.slice();
    const beta = Math.sqrt(dotVec(r0, r0));
    const v: number[][] = [];
    v.push(r0.map(val => val / beta));
    const H: number[][] = Array.from({ length: maxIter + 1 }, () => Array(maxIter).fill(0));
    const residuals: number[] = [];

    for (let j = 0; j < maxIter; j++) {
        const w = A.map(row => dotVec(row, v[j]));
        for (let i = 0; i <= j; i++) {
            H[i][j] = dotVec(w, v[i]);
            for (let k = 0; k < n; k++) w[k] -= H[i][j] * v[i][k];
        }
        H[j + 1][j] = Math.sqrt(dotVec(w, w));
        if (H[j + 1][j] > EPSILON) {
            v.push(w.map(val => val / H[j + 1][j]));
        }

        const y = Array(j + 1).fill(0);
        y[0] = beta;
        // simple least squares via back-substitution on upper H (small j)
        for (let k = j; k >= 0; k--) {
            let sum = y[k];
            for (let i = k + 1; i <= j; i++) {
                sum -= H[k][i] * y[i];
            }
            y[k] = sum / (H[k][k] || EPSILON);
        }
        x = Array(n).fill(0);
        for (let k = 0; k <= j; k++) {
            for (let i = 0; i < n; i++) x[i] += v[k][i] * y[k];
        }
        const r = A.map((row, i) => dotVec(row, x) - b[i]);
        const norm = Math.sqrt(dotVec(r, r));
        residuals.push(norm);
        if (norm < tol) break;
    }
    return { x, residuals };
};

// #endregion
