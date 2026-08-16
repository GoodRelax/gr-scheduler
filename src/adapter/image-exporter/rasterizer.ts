// ImageExporter -- declares the interface Rasterizer (table T-065 IF-6).
//
// @unit      UF-40   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    n/a
// @seam      Rasterizer, implemented in another layer (LR-5)
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface Rasterizer {
  // TODO: declare the members this seam supplies.
}
