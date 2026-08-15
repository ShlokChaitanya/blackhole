# 🌌 EventHorizon — Relativistic Simulation Engine

> **A research-inspired computational physics engine for simulating black holes, curved spacetime, relativistic effects, electromagnetic fields, plasma dynamics, and gravitational phenomena.**

**EventHorizon** is an experimental relativistic simulation engine designed to bridge **theoretical physics, numerical computation, and real-time visualization**.

The project models black-hole environments using mathematical and physical frameworks derived from **General Relativity, relativistic mechanics, electromagnetism, plasma physics, radiation physics, and numerical methods**.

The objective is not simply to render a visually convincing black hole, but to build a modular physics layer where the visualization is driven by calculated physical quantities.

---

## ✨ What It Simulates

EventHorizon currently provides a foundation for modeling:

* 🕳️ Black-hole event horizons
* 🌌 Curved spacetime
* 🌀 Kerr rotating black holes
* ⚡ Electromagnetic fields
* 🔭 Gravitational lensing
* 💫 Photon trajectories and photon rings
* ⏱️ Relativistic time dilation
* 🔴 Gravitational redshift
* 🌡️ Accretion-disk physics
* 🧲 Plasma and magnetohydrodynamics
* 🌊 Orbital dynamics
* 📡 Gravitational waves
* ⚛️ Hawking radiation
* 🧮 Tensor and curvature calculations
* 🚀 Numerical-relativity foundations
* 🎮 GPU-accelerated numerical computation

---

# 🧠 Physics Architecture

The project separates the **physics engine** from the **visualization and rendering system**.

```text
EventHorizon
│
├── Physics Engine
│   │
│   ├── General Relativity
│   ├── Schwarzschild Geometry
│   ├── Kerr Geometry
│   ├── Kerr-Newman Geometry
│   ├── Einstein Field Equations
│   ├── Tensor Operations
│   ├── Curvature Calculations
│   ├── Geodesic Integration
│   │
│   ├── Electromagnetism
│   ├── Maxwell Equations
│   ├── Plasma Physics
│   ├── Magnetohydrodynamics
│   ├── Radiation Transport
│   │
│   ├── Accretion Physics
│   ├── Gravitational Lensing
│   ├── Relativistic Doppler Effects
│   ├── Gravitational Redshift
│   ├── Time Dilation
│   │
│   ├── Hawking Radiation
│   ├── Black Hole Thermodynamics
│   ├── Gravitational Waves
│   ├── Orbital Dynamics
│   ├── N-Body Physics
│   │
│   └── Numerical Relativity
│
├── Numerical Solvers
│   ├── ODE Integration
│   ├── Tensor Solvers
│   ├── Geodesic Solvers
│   └── GPU Solvers
│
├── Validation
│   ├── Dynamics Tests
│   ├── Geodesic Tests
│   ├── Invariant Tests
│   └── MHD Tests
│
└── Renderer
    ├── Black Hole
    ├── Accretion Disk
    ├── Photon Ring
    ├── Gravitational Lensing
    ├── Spacetime Visualization
    └── Star Field
```

This separation allows the physical model to evolve independently from the renderer.

---

# 🔬 Relativistic Physics

The foundation of the engine is **General Relativity**.

The system is designed around Einstein's field equations:

$$
G_{\mu\nu} + \Lambda g_{\mu\nu}
===============================

\frac{8\pi G}{c^4}T_{\mu\nu}
$$

Different spacetime geometries can then be introduced as solutions or approximations of Einstein's equations.

### Schwarzschild Geometry

Used for non-rotating, uncharged black holes.

### Kerr Geometry

Used for rotating black holes and includes effects such as:

* Frame dragging
* Ergospheres
* Rotational energy
* Spin-dependent photon trajectories
* Spin-dependent ISCO

### Kerr-Newman Geometry

Extends the model to include electric charge.

---

# 🌀 Geodesic Physics

Light does not simply travel in straight lines around a black hole.

Instead, photons follow **null geodesics through curved spacetime**.

The engine therefore provides a geodesic integration layer capable of calculating trajectories through a metric.

This forms the foundation for:

* Gravitational lensing
* Photon rings
* Black-hole shadows
* Relativistic ray tracing
* Observer-dependent images

---

# 🔭 Relativistic Observation

The same physical scene can look dramatically different depending on the observer.

EventHorizon accounts for relativistic observational effects including:

* Gravitational redshift
* Relativistic Doppler shifting
* Doppler beaming
* Time dilation
* Light bending
* Frame dragging
* Far-side disk lensing

The goal is to make the rendered image a consequence of the underlying spacetime model rather than a purely artistic approximation.

---

# 💫 Accretion Disk

The accretion environment is modeled as a relativistic plasma system.

The physics layer provides foundations for:

* Orbital velocity
* Temperature
* Density
* Magnetic fields
* Plasma behavior
* Radiation
* Relativistic Doppler effects
* Gravitational redshift

The long-term objective is to evolve this toward **General Relativistic Magnetohydrodynamics (GRMHD)** rather than relying exclusively on procedural animation.

---

# ⚡ Electromagnetic Physics

The engine includes an electromagnetic physics layer based on Maxwell's equations.

This provides the foundation for modeling:

* Electric fields
* Magnetic fields
* Electromagnetic energy
* Charged particles
* Plasma interactions
* Magnetic structures around compact objects

The electromagnetic layer is designed to eventually interact directly with the curved spacetime and plasma systems.

---

# 🧲 GRMHD

One of the major goals of EventHorizon is to move toward a coupled:

**General Relativity + Magnetohydrodynamics**

simulation.

This allows investigation of phenomena such as:

* Magnetized accretion disks
* Relativistic plasma
* Magnetic turbulence
* Jet formation
* Energy extraction from rotating black holes

This is significantly more physically meaningful than treating the accretion disk as a texture or particle effect.

---

# 🌊 Gravitational Waves

The engine also contains a gravitational-wave physics layer for studying:

* Orbital decay
* Compact-object dynamics
* Inspiral
* Merger physics
* Gravitational-wave emission

The long-term goal is to connect analytical approximations with numerical-relativity calculations.

---

# ⚛️ Quantum Effects

EventHorizon also contains experimental modules for black-hole quantum physics.

These include:

* Hawking radiation
* Black-hole temperature
* Black-hole entropy
* Thermodynamic relationships

These modules are intentionally separated from the classical relativistic engine because a complete theory of quantum gravity remains an open problem in physics.

---

# 🧮 Numerical Physics

A physically meaningful simulation requires more than equations.

It requires stable numerical methods.

The project therefore includes a numerical layer for:

* Ordinary differential equations
* Geodesic integration
* Tensor operations
* Numerical-relativity calculations
* Conservation checks
* Physical invariants
* GPU acceleration

Validation is treated as an important part of the simulation rather than an afterthought.

---

# 🧪 Validation & Testing

The repository includes dedicated tests for the physics engine.

```text
physics/
├── test_dynamics.js
├── test_geodesic.js
├── test_invariants.js
└── test_mhd.js
```

The purpose is to verify that numerical implementations preserve expected physical and mathematical properties.

Examples include:

* Geodesic behavior
* Conservation laws
* Physical invariants
* Orbital dynamics
* MHD behavior

---

# 🖥️ Real-Time Visualization

The physics engine feeds calculated quantities into a real-time renderer.

Current visualization layers include:

* Event Horizon
* Accretion Disk
* Photon Ring
* Relativistic Lensing
* Spacetime Grid
* Star Field

The interface exposes physical parameters such as:

```text
Mass
Spin
Accretion Rate
Inclination
Field of View
```

Changing simulation parameters changes the underlying physical state and therefore the visualization.

---

# 📐 Current Metrics

The interface exposes quantities including:

```text
Event Horizon Radius
Photon Sphere
ISCO Radius
Time Dilation
Gravitational Redshift
Simulation Time
```

For example, the Schwarzschild radius is:

$$
r_s = \frac{2GM}{c^2}
$$

while rotating black holes require the Kerr metric and spin-dependent calculations.

---

# 🧪 Scientific Scope

EventHorizon is **research-inspired software**, not a replacement for production astrophysical simulation codes or a validated scientific instrument.

Some components use analytical solutions, numerical approximations, parameterized models, or simplified physics for real-time computation.

The project explicitly aims to distinguish between:

**Exact analytical physics**

**Numerical solutions**

**Physical approximations**

**Visualization approximations**

This distinction is important when interpreting simulation results.

---

# 🗺️ Roadmap

### Phase I — Relativistic Foundation

* [x] Schwarzschild geometry
* [x] Kerr geometry
* [x] Geodesic integration
* [x] Gravitational redshift
* [x] Time dilation
* [x] Gravitational lensing
* [x] Orbital dynamics

### Phase II — Relativistic Environment

* [x] Accretion-disk framework
* [x] Electromagnetic framework
* [x] Plasma framework
* [x] MHD framework
* [x] Radiation transport framework
* [x] Relativistic Doppler effects

### Phase III — Numerical Relativity

* [x] Numerical-relativity foundation
* [x] Tensor operations
* [x] Curvature calculations
* [ ] Full spacetime evolution
* [ ] Advanced GRMHD evolution
* [ ] Relativistic radiation transport
* [ ] Binary black-hole merger simulation

### Phase IV — High-Performance Computing

* [x] GPU solver foundation
* [ ] WebGPU acceleration
* [ ] GPU tensor operations
* [ ] Parallel geodesic integration
* [ ] Distributed simulation
* [ ] High-resolution ray tracing

### Phase V — Relativistic Universe

Future versions aim to move beyond isolated black holes toward a general relativistic environment containing:

```text
Stars
Planets
Neutron Stars
Black Holes
Plasma
Electromagnetic Fields
Radiation
Gravitational Waves
Curved Spacetime
Multiple Massive Bodies
```

The ultimate objective is to experiment with a **physically driven relativistic universe**, where objects interact through calculated fields and spacetime rather than predefined visual effects.

---

# 📚 Physics Foundations

The project draws inspiration from established work in:

* General Relativity
* Differential Geometry
* Tensor Calculus
* Special Relativity
* General Relativistic Magnetohydrodynamics
* Plasma Physics
* Electrodynamics
* Numerical Relativity
* Relativistic Radiative Transfer
* Black-Hole Thermodynamics
* Quantum Field Theory in Curved Spacetime
* Gravitational-Wave Physics

Relevant research communities include work associated with the Event Horizon Telescope, LIGO/Virgo/KAGRA, numerical-relativity groups, and relativistic astrophysics.

---

# ⚠️ Disclaimer

EventHorizon is an experimental computational physics project.

The presence of a physical equation in the code does not automatically imply that the entire simulation is an exact solution to the underlying physical system.

Real astrophysical systems involve extremely complex coupled equations and often require high-performance computing infrastructure.

The project therefore prioritizes:

**physical correctness → mathematical consistency → numerical stability → performance → visualization**

rather than visual realism alone.

---

# 🚀 Why This Project?

Black holes provide an unusual intersection between:

> **Mathematics × Physics × Computer Science × Graphics × High-Performance Computing**

EventHorizon is an attempt to explore that intersection through software.

The long-term vision is to build an accessible experimental platform where complex relativistic phenomena can be calculated, visualized, inspected, and interacted with in real time.

---

## ⭐ Project Status

**Active Research / Experimental**

The architecture and physics models are continuously evolving as more rigorous numerical methods and physical models are introduced.

If you are interested in computational physics, numerical relativity, astrophysics, GPU computing, or physically based rendering, contributions and scientific discussion are welcome.

---

## License

Add your chosen license here.

---

**EventHorizon — Exploring the mathematics of extreme spacetime.** 🌌
