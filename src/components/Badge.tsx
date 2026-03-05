const variants: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  gray: "bg-gray-100 text-gray-800 dark:bg-zinc-700/50 dark:text-zinc-300",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

export default function Badge({
  label,
  variant = "gray",
}: {
  label: string;
  variant?: "blue" | "green" | "gray" | "purple" | "red" | "yellow";
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  );
}
