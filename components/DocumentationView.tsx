import React from 'react';

interface DocumentationViewProps {
    className?: string;
}

const DocSection: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
    <section id={id} className="doc-section">
        <h2>{title}</h2>
        {children}
    </section>
);

const DocumentationView: React.FC<DocumentationViewProps> = ({ className }) => {
    const updated = new Date().toLocaleDateString();
    return (
        <div className={`doc-root ${className ?? ''}`.trim()}>
            <div className="doc-cover page-break">
                <h1>Matrix Master Documentation</h1>
                <p className="doc-subtitle">Offline Edition</p>
                <p className="doc-meta">Last updated: {updated}</p>
            </div>

            <div className="doc-toc page-break">
                <h2>Table of Contents</h2>
                <ol>
                    <li>Overview</li>
                    <li>Quick Start</li>
                    <li>Matrix Input and Data Types</li>
                    <li>Core Modes</li>
                    <li>Analysis and Decompositions</li>
                    <li>History, Snapshots, and Caching</li>
                    <li>Library and Presets</li>
                    <li>Sparse Matrix Tools</li>
                    <li>Batch Runner and Recipes</li>
                    <li>Export, Import, and Clipboard</li>
                    <li>Reports and PDF Output</li>
                    <li>Profiles and Settings</li>
                    <li>Offline Help Pack</li>
                    <li>Storage, Privacy, and Offline Guarantees</li>
                    <li>Troubleshooting</li>
                </ol>
            </div>

            <div className="doc-body">
                <DocSection id="overview" title="Overview">
                    <p>
                        Matrix Master is a fully offline linear algebra workspace. It solves systems, evaluates
                        matrix expressions, and performs numeric decompositions while keeping all data on your
                        device. No network access is required for calculation, storage, or reporting.
                    </p>
                    <div className="doc-callout">
                        <strong>Offline by design:</strong> all features, help content, and exports work without
                        internet access. Your data stays in local browser storage unless you explicitly export it.
                    </div>
                </DocSection>

                <DocSection id="quick-start" title="Quick Start">
                    <ol className="doc-list">
                        <li>Choose a mode: System Solver, Matrix Operations, Determinant of Operation, or Analysis.</li>
                        <li>Enter or load matrices using the matrix grid.</li>
                        <li>Run Calculate or Analyze to generate results.</li>
                        <li>Use History to save snapshots or Export to share results as files.</li>
                        <li>Print a PDF report from the Report dialog.</li>
                    </ol>
                </DocSection>

                <DocSection id="input" title="Matrix Input and Data Types">
                    <p>
                        Matrix cells accept integers, fractions (for example 2/3), and symbolic terms (for example
                        a, 5b-3). Exact mode keeps symbolic fractions. Numeric mode requires numeric entries.
                    </p>
                    <ul className="doc-list">
                        <li>Empty cells are treated as missing and must be filled before calculation.</li>
                        <li>Save matrices to the Library with a name, folder, and tags for later reuse.</li>
                        <li>Load matrices into System Solver, Analysis, or named matrices in Matrix Operations.</li>
                        <li>Use Variable Assumptions to apply constraints like nonzero or positive.</li>
                    </ul>
                </DocSection>

                <DocSection id="core-modes" title="Core Modes">
                    <h3>System Solver</h3>
                    <p>
                        Solve homogeneous or non-homogeneous systems with row-reduction. The app displays REF,
                        RREF, pivot structure, and solution sets. Tutor Mode adds brief explanations for each row
                        operation. The Step Timeline view adds playback, bookmarks, and jump-to-pivot navigation.
                    </p>
                    <h3>Matrix Operations</h3>
                    <p>
                        Evaluate expressions like A * B, A^2 - C, or (A + B) * C. Use the text expression input
                        or the visual builder. Results include step-by-step multiplication details when requested.
                    </p>
                    <h3>Determinant of Operation</h3>
                    <p>
                        Compute the determinant of a matrix expression without expanding the full result. This
                        is useful for symbolic reasoning and checking invertibility quickly.
                    </p>
                    <h3>Analysis</h3>
                    <p>
                        Compute rank and trace in exact or numeric mode. Numeric mode unlocks LU, QR, SVD, and
                        eigenvalue/eigenvector calculations. Enable only the decompositions you need.
                    </p>
                </DocSection>

                <DocSection id="analysis" title="Analysis and Decompositions">
                    <p>
                        Numeric analysis uses standard linear algebra decompositions. Results include factor
                        matrices and helper values like singular values or eigenvectors.
                    </p>
                    <table className="doc-table">
                        <thead>
                            <tr>
                                <th>Option</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>LU</td>
                                <td>P, L, and U such that P * A = L * U.</td>
                            </tr>
                            <tr>
                                <td>QR</td>
                                <td>Q has orthonormal columns and A = Q * R.</td>
                            </tr>
                            <tr>
                                <td>SVD</td>
                                <td>U, S, V^T with singular values in S.</td>
                            </tr>
                            <tr>
                                <td>Eigen</td>
                                <td>Eigenvalues and eigenvectors when the matrix is square.</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="doc-callout">
                        <strong>Precision control:</strong> set digits, fixed or scientific format, or fractionize
                        output for reports and exports in Settings.
                    </div>
                </DocSection>

                <DocSection id="history" title="History, Snapshots, and Caching">
                    <p>
                        Save named snapshots to build an undo/redo stack. Each snapshot stores the full workspace
                        state plus cached determinant and inverse results for fast comparisons.
                    </p>
                    <ul className="doc-list">
                        <li>Undo/redo navigates snapshots without losing progress.</li>
                        <li>Cached determinant/inverse results appear in History for quick reference.</li>
                        <li>Auto-snapshot on calculate can be toggled in History.</li>
                    </ul>
                </DocSection>

                <DocSection id="library" title="Library and Presets">
                    <p>
                        The Library stores matrices with folders and tags. Use search to filter by name, tag, or
                        folder. Presets generate common matrices instantly.
                    </p>
                    <ul className="doc-list">
                        <li>Presets include identity, permutation, Jordan block, Hilbert, and random SPD.</li>
                        <li>Library entries are available to the Batch Runner and export features.</li>
                        <li>Compare Matrices highlights differences between any two matrices.</li>
                    </ul>
                </DocSection>

                <DocSection id="sparse" title="Sparse Matrix Tools">
                    <p>
                        Sparse View converts matrices into CSR or CSC arrays and visualizes a sparsity heatmap.
                        Adjust the zero threshold to control what counts as a non-zero entry.
                    </p>
                </DocSection>

                <DocSection id="batch" title="Batch Runner and Recipes">
                    <h3>Batch Runner</h3>
                    <p>
                        Apply analysis or a single matrix expression to multiple saved matrices. Export results
                        as JSON or print a combined batch report.
                    </p>
                    <h3>Matrix Recipes</h3>
                    <p>
                        Save a matrix operation sequence as a reusable macro. Recipes store an expression that
                        can be applied to new input matrices later.
                    </p>
                </DocSection>

                <DocSection id="export" title="Export, Import, and Clipboard">
                    <p>
                        Export the full app state as JSON or share files locally. Import JSON or .mmatrix files to
                        restore a workspace, or import CSV/TSV/LaTeX directly into a matrix target.
                    </p>
                    <ul className="doc-list">
                        <li>Clipboard formats: CSV, LaTeX, and JSON.</li>
                        <li>Share File bundles app state into a local file (no URLs).</li>
                    </ul>
                </DocSection>

                <DocSection id="reports" title="Reports and PDF Output">
                    <p>
                        The Report dialog prints a styled PDF with an optional cover page, table of contents,
                        steps, assumptions, and tutor notes. Reports work fully offline using the browser print
                        dialog.
                    </p>
                </DocSection>

                <DocSection id="profiles" title="Profiles and Settings">
                    <p>
                        Workspace Profiles keep libraries, history, and settings isolated. Create multiple
                        profiles for different courses or projects.
                    </p>
                    <ul className="doc-list">
                        <li>Theme, density, and font size control the UI appearance.</li>
                        <li>Number formatting controls precision and fractionization.</li>
                        <li>Report options control cover page, table of contents, and step details.</li>
                    </ul>
                </DocSection>

                <DocSection id="help" title="Offline Help Pack">
                    <p>
                        The offline help pack includes a quick start, sample matrices, and a guided walkthrough.
                        Everything is bundled locally and never uses external links.
                    </p>
                </DocSection>

                <DocSection id="privacy" title="Storage, Privacy, and Offline Guarantees">
                    <p>
                        All data is stored locally using browser storage. The app does not send or receive any
                        network traffic. Exports are saved to local files only when you choose to share them.
                    </p>
                    <div className="doc-callout">
                        <strong>Tip:</strong> use Profiles to separate projects and keep libraries organized.
                    </div>
                </DocSection>

                <DocSection id="troubleshooting" title="Troubleshooting">
                    <ul className="doc-list">
                        <li>If a calculation fails, check for empty cells or non-numeric entries in numeric mode.</li>
                        <li>For large matrices, disable unneeded decompositions to improve performance.</li>
                        <li>If exports appear empty, ensure popups are not blocked for file downloads.</li>
                        <li>If printing shows the wrong page, open the Report or Documentation dialog and retry.</li>
                    </ul>
                </DocSection>
            </div>
        </div>
    );
};

export default DocumentationView;
