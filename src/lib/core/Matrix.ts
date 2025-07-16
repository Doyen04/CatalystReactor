
class Matrix {
    mat: number[][];

    constructor(m = [
        [1, 0, 0,],
        [0, 1, 0,],
        [0, 0, 1]
    ]) {
        this.mat = m;
    }
    static identity(): Matrix { return new Matrix(); }

    static translate(tx: number, ty: number): Matrix {
        return new Matrix([
            [1, 0, tx],
            [0, 1, ty],
            [0, 0, 1]
        ]);
    }

    static scale(sx: number, sy: number): Matrix {
        return new Matrix([
            [sx, 0, 0],
            [0, sy, 0],
            [0, 0, 1]
        ]);
    }

    static skew(sx: number, sy: number): Matrix {
        return new Matrix([
            [1, Math.tan(sx), 0],
            [Math.tan(sy), 1, 0],
            [0, 0, 1]
        ]);
    }

    static rotate(theta: number): Matrix {
        const c: number = Math.cos(theta), s: number = Math.sin(theta);
        return new Matrix([
            [c, -s, 0],
            [s, c, 0],
            [0, 0, 1]
        ]);
    }

    multiply(bm: Matrix): Matrix {
        const a = this.mat, b = bm.mat;
        const n = a.length;
        const C = Array.from({ length: n }, () => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < n; k++) {
                    C[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return new Matrix(C);
    }

    applyToPoint(x: number, y: number) {
        const [a, b, tx, c, d, ty] = this.mat.flat();
        return { x: a * x + b * y + tx, y: c * x + d * y + ty };
    }
}

export default Matrix;
