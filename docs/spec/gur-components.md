GUI Components
 +-Application Header
    +-Application Logo
    +-Project Title
    +-Header Commands
 +-Activity Title Panel
    +-Activity List
 +-Schedule Canvas
    +-Date Axis
    +-Activity Rows
       +-Canvas Items
          +-Milestones
          +-Activity Spans
          +-Comment Boxes
          +-Progress Line
          +-Highlight Boxes
 +-Properties Panel
 +-Command Palette
    +-Command Groups
       +-Command Items
 +-Grid Lines
    +-Vertical Lines
      +-Year Lines
      +-Month Lines
      +-Date Lines
    +-Horizontal Lines
 +-Cursor
    +-Todays Line
    +-Single Cursor
    +-Cross Cursor
    +-Dual Cursor
       +-Cursor Span
  

Schedule Canvas
  ├ Date Axis
  ├ Grid Lines (date / category)   ← 追加（実在）
  ├ Activity Rows
  │   └ Canvas Items
  │       ├ Milestones
  │       ├ Activity Spans (task bars)
  │       └ Dependency Lines        ← 追加（核機能なのに抜けていた）
  └ Canvas Overlays                 ← Comment/Highlight/Progress を Items から分離
      ├ Comment Boxes / Highlight Boxes / Progress Line / Watermark
