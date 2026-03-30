// Keep in its current file location — don't move it
"use client";
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(err, info) {
    console.error("Panel error:", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-zinc-950/60 border border-red-900/30 rounded-2xl p-6 text-center text-sm text-zinc-500">
          Something went wrong.{" "}
          {/* Changed: also clear the error object on retry */}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-white underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}