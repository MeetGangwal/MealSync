#!/usr/bin/env python3
"""
MealSync — Lightweight Standalone Load Testing Tool
Zero external dependencies (uses standard Python 3 urllib + concurrent.futures).

Usage:
  python infra/load-testing/load_test.py --url http://localhost:3080/health --concurrency 10 --duration 10
"""

import argparse
import concurrent.futures
import math
import sys
import time
import urllib.error
import urllib.request


def parse_args():
    parser = argparse.ArgumentParser(description="MealSync Load Testing Tool")
    parser.add_argument(
        "--url",
        default="http://localhost:3080/health",
        help="Target URL to load test (default: http://localhost:3080/health)",
    )
    parser.add_argument(
        "-c",
        "--concurrency",
        type=int,
        default=10,
        help="Number of concurrent client threads (default: 10)",
    )
    parser.add_argument(
        "-d",
        "--duration",
        type=int,
        default=10,
        help="Duration of the load test in seconds (default: 10)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=5.0,
        help="Per-request timeout in seconds (default: 5.0)",
    )
    return parser.parse_args()


def calculate_percentile(sorted_data, percentile):
    if not sorted_data:
        return 0.0
    k = (len(sorted_data) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1


def worker(url, stop_time, timeout):
    latencies = []
    successes = 0
    failures = 0

    while time.time() < stop_time:
        start = time.perf_counter()
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "MealSync-LoadTester/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status = response.getcode()
                response.read()
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                if 200 <= status < 400:
                    successes += 1
                    latencies.append(elapsed_ms)
                else:
                    failures += 1
        except Exception:
            failures += 1

    return latencies, successes, failures


def run_load_test(url, concurrency, duration, timeout):
    print("=" * 70)
    print("MealSync Load Test Execution")
    print("=" * 70)
    print(f"Target URL:    {url}")
    print(f"Concurrency:   {concurrency} worker threads")
    print(f"Duration:      {duration} seconds")
    print(f"Timeout:       {timeout}s per request")
    print("-" * 70)
    print("Warming up workers and sending traffic...")

    stop_time = time.time() + duration
    test_start = time.perf_counter()

    all_latencies = []
    total_successes = 0
    total_failures = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(worker, url, stop_time, timeout)
            for _ in range(concurrency)
        ]
        for f in concurrent.futures.as_completed(futures):
            lats, succ, fail = f.result()
            all_latencies.extend(lats)
            total_successes += succ
            total_failures += fail

    actual_duration = time.perf_counter() - test_start
    total_requests = total_successes + total_failures
    rps = total_requests / actual_duration if actual_duration > 0 else 0
    error_rate = (
        (total_failures / total_requests) * 100.0 if total_requests > 0 else 0.0
    )

    all_latencies.sort()

    print("\n" + "=" * 70)
    print("LOAD TEST RESULTS SUMMARY")
    print("=" * 70)
    print(f"Total Requests:     {total_requests:,}")
    print(f"Successful (2xx):   {total_successes:,}")
    print(f"Failed / Errors:    {total_failures:,}")
    print(f"Error Rate:         {error_rate:.2f}%")
    print(f"Elapsed Time:       {actual_duration:.2f} seconds")
    print(f"Throughput (RPS):   {rps:.2f} req/sec")
    print("-" * 70)

    if all_latencies:
        min_lat = all_latencies[0]
        max_lat = all_latencies[-1]
        mean_lat = sum(all_latencies) / len(all_latencies)
        p50 = calculate_percentile(all_latencies, 50)
        p90 = calculate_percentile(all_latencies, 90)
        p95 = calculate_percentile(all_latencies, 95)
        p99 = calculate_percentile(all_latencies, 99)

        print("Latency Percentiles (ms):")
        print(f"  Min:              {min_lat:.2f} ms")
        print(f"  Mean:             {mean_lat:.2f} ms")
        print(f"  Median (p50):     {p50:.2f} ms")
        print(f"  90th percentile:  {p90:.2f} ms")
        print(f"  95th percentile:  {p95:.2f} ms")
        print(f"  99th percentile:  {p99:.2f} ms")
        print(f"  Max:              {max_lat:.2f} ms")
        print("=" * 70)

        # Print Markdown Table for documentation
        print("\nMarkdown Table for Project Report:")
        print(
            "| Concurrency | Total Requests | RPS (Throughput) | Error Rate | Mean Latency | p95 Latency | p99 Latency |"
        )
        print(
            "|---|---|---|---|---|---|---|"
        )
        print(
            f"| {concurrency} VUs | {total_requests:,} | {rps:.1f} req/s | {error_rate:.2f}% | {mean_lat:.2f} ms | {p95:.2f} ms | {p99:.2f} ms |"
        )
    else:
        print("No successful latency samples recorded.")

    print("\n")


if __name__ == "__main__":
    args = parse_args()
    run_load_test(args.url, args.concurrency, args.duration, args.timeout)
