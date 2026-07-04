"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

type SearchInputProps = {
  placeholder?: string;
  paramName?: string;
};

const DEBOUNCE_MS = 250;

export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) {
        params.set(paramName, value);
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [value, paramName, pathname, router]);

  return (
    <Input
      type="search"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="max-w-sm"
    />
  );
}
