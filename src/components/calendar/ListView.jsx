import PostTable from '../posts/PostTable';
export default function ListView(/** @type {Omit<import("../component-types").PostTableProps, "onOpen" | "onSelect"> & {onSelect: (post: import("../component-types").EntityRecord) => void}} */ { onSelect, ...props }) { return <PostTable {...props} onOpen={onSelect} />; }
