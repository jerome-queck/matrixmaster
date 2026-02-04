import { describe, expect, it } from 'vitest';
import { hashMatrix, hashWorkerRequest } from '../../services/hash';
import { parseInput } from '../../services/matrixService';
import type { MatrixWorkerRequest, ValidMatrix } from '../../types';

const makeMatrix = (rows: number[][]): ValidMatrix =>
  rows.map(row => row.map(value => parseInput(String(value)))) as ValidMatrix;

describe('hash utilities', () => {
  it('produces stable matrix hashes for identical matrices', () => {
    const matrixA = makeMatrix([[1, 2], [3, 4]]);
    const matrixB = makeMatrix([[1, 2], [3, 4]]);

    expect(hashMatrix(matrixA)).toBe(hashMatrix(matrixB));
  });

  it('changes matrix hash when values change', () => {
    const matrixA = makeMatrix([[1, 2], [3, 4]]);
    const matrixB = makeMatrix([[1, 2], [3, 5]]);

    expect(hashMatrix(matrixA)).not.toBe(hashMatrix(matrixB));
  });

  it('hashes worker payloads deterministically', () => {
    const payload: MatrixWorkerRequest['payload'] = {
      matrix: makeMatrix([[1, 0], [0, 1]]),
      analysisMode: 'numeric',
      analysisOptions: { computeLU: true, computeQR: false, computeSVD: true, computeEigen: false },
    };

    expect(hashWorkerRequest('analysis', payload)).toBe(hashWorkerRequest('analysis', payload));
  });

  it('changes hash when analysis options change', () => {
    const matrix = makeMatrix([[1, 0], [0, 1]]);
    const payloadA: MatrixWorkerRequest['payload'] = {
      matrix,
      analysisMode: 'numeric',
      analysisOptions: { computeLU: true, computeQR: false, computeSVD: true, computeEigen: false },
    };
    const payloadB: MatrixWorkerRequest['payload'] = {
      matrix,
      analysisMode: 'numeric',
      analysisOptions: { computeLU: false, computeQR: false, computeSVD: true, computeEigen: false },
    };

    expect(hashWorkerRequest('analysis', payloadA)).not.toBe(hashWorkerRequest('analysis', payloadB));
  });
});
