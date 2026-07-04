// Package hoststat samples host machine utilization from the Linux /proc filesystem with
// zero third-party dependencies. It exists so GET /stats can show the box actually working.
//
// Container note: /proc/stat, /proc/meminfo, /proc/loadavg and /proc/uptime are kernel
// (procfs) interfaces, not part of the image, and they report HOST-level figures rather than
// this container's cgroup limits. That's deliberate — the dashboard is a "is the machine
// busy" view, and host CPU includes the separate llama.cpp model container's load.
package hoststat

import (
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Snapshot is one reading of host utilization. A field is left at its previous value (0 on
// first read) when its /proc source can't be parsed, so a transient read error never blanks
// the dashboard.
type Snapshot struct {
	CPUPct     float64 // 0..100, whole-machine busy % over the last sample interval
	MemUsedPct float64 // 0..100
	Load1      float64 // 1-minute load average
	Cores      int
	UptimeSec  int64
}

// Sampler holds the latest reading. sample() runs on a single goroutine (the ticker started
// by Start, plus one priming call in New), so the CPU-delta state needs no lock; only the
// published Snapshot is mutex-guarded against concurrent Get callers.
type Sampler struct {
	mu   sync.Mutex
	snap Snapshot

	prevIdle, prevTotal uint64 // last /proc/stat totals, for the CPU delta
}

// New returns a primed Sampler. The first CPU% reads as 0 (a delta needs two samples); call
// Start to keep it fresh.
func New() *Sampler {
	s := &Sampler{}
	s.snap.Cores = runtime.NumCPU()
	s.sample()
	return s
}

// Start refreshes the snapshot every interval until stop is closed.
func (s *Sampler) Start(every time.Duration, stop <-chan struct{}) {
	go func() {
		t := time.NewTicker(every)
		defer t.Stop()
		for {
			select {
			case <-t.C:
				s.sample()
			case <-stop:
				return
			}
		}
	}()
}

// Get returns the most recent reading.
func (s *Sampler) Get() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snap
}

func (s *Sampler) sample() {
	cpu := s.cpuPct()
	mem := memUsedPct()
	load := load1()
	up := uptimeSec()

	s.mu.Lock()
	if cpu >= 0 {
		s.snap.CPUPct = cpu
	}
	if mem >= 0 {
		s.snap.MemUsedPct = mem
	}
	if load >= 0 {
		s.snap.Load1 = load
	}
	if up >= 0 {
		s.snap.UptimeSec = up
	}
	s.mu.Unlock()
}

// cpuPct returns whole-machine busy % since the previous call, or -1 when it can't yet be
// computed (unreadable /proc/stat, first sample, or no elapsed ticks).
func (s *Sampler) cpuPct() float64 {
	idle, total, ok := readCPU()
	if !ok {
		return -1
	}
	prevIdle, prevTotal := s.prevIdle, s.prevTotal
	s.prevIdle, s.prevTotal = idle, total

	if prevTotal == 0 || total <= prevTotal {
		return -1
	}
	dTotal := total - prevTotal
	dIdle := idle - prevIdle
	busy := float64(dTotal-dIdle) / float64(dTotal) * 100
	if busy < 0 {
		busy = 0
	}
	if busy > 100 {
		busy = 100
	}
	return busy
}

// readCPU parses the aggregate "cpu" line of /proc/stat, returning idle (idle+iowait) and
// total jiffies.
func readCPU() (idle, total uint64, ok bool) {
	b, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0, 0, false
	}
	line := string(b)
	if i := strings.IndexByte(line, '\n'); i >= 0 {
		line = line[:i]
	}
	f := strings.Fields(line)
	// Fields: cpu user nice system idle iowait irq softirq steal ...
	if len(f) < 6 || f[0] != "cpu" {
		return 0, 0, false
	}
	for i, v := range f[1:] {
		n, err := strconv.ParseUint(v, 10, 64)
		if err != nil {
			continue
		}
		total += n
		if i == 3 || i == 4 { // idle, iowait
			idle += n
		}
	}
	return idle, total, true
}

func memUsedPct() float64 {
	b, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return -1
	}
	var total, avail uint64
	for _, line := range strings.Split(string(b), "\n") {
		f := strings.Fields(line)
		if len(f) < 2 {
			continue
		}
		switch f[0] {
		case "MemTotal:":
			total, _ = strconv.ParseUint(f[1], 10, 64)
		case "MemAvailable:":
			avail, _ = strconv.ParseUint(f[1], 10, 64)
		}
	}
	if total == 0 || avail > total {
		return -1
	}
	return float64(total-avail) / float64(total) * 100
}

func load1() float64 {
	b, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return -1
	}
	f := strings.Fields(string(b))
	if len(f) < 1 {
		return -1
	}
	v, err := strconv.ParseFloat(f[0], 64)
	if err != nil {
		return -1
	}
	return v
}

func uptimeSec() int64 {
	b, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return -1
	}
	f := strings.Fields(string(b))
	if len(f) < 1 {
		return -1
	}
	v, err := strconv.ParseFloat(f[0], 64)
	if err != nil {
		return -1
	}
	return int64(v)
}
