# Outy - Bolsa de Trabajo para Nicaragua

![Logo de Outy](assets/outy_logo.png)

**Outy** es una plataforma de código abierto diseñada para conectar a profesionales y empresas en Nicaragua. Su objetivo es centralizar y simplificar el proceso de búsqueda y publicación de empleos en el país, creando un puente directo entre el talento local y las oportunidades laborales.

[![Estado del Build](https://img.shields.io/badge/build-passing-FF42A5?style=flat&logo=github&logoColor=white)](https://github.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-6B46F1?style=flat&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Flutter](https://img.shields.io/badge/Frontend-Flutter-02569B?style=flat&logo=flutter&logoColor=white)](https://flutter.dev/)


---

## 📋 Tabla de Contenidos
1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Características Principales](#-características-principales)
3. [Tecnologías Utilizadas](#️-tecnologías-utilizadas)
4. [Arquitectura del Sistema](#️-arquitectura-del-sistema)

---

## 🎯 Descripción del Proyecto

El mercado laboral en Nicaragua a menudo se encuentra fragmentado en diversas plataformas y redes sociales. **Outy** nace como una solución moderna y centralizada para abordar este desafío. La plataforma ofrece herramientas especializadas tanto para **candidatos** que buscan activamente empleo, como para **empresas y reclutadores** que necesitan encontrar al profesional ideal.

- **Para Candidatos:** Permite crear un perfil profesional completo, subir su CV, detallar su experiencia y educación, y postularse a ofertas de manera sencilla.
- **Para Empleadores:** Ofrece un portal para publicar y gestionar ofertas de trabajo, buscar perfiles de candidatos, y comunicarse directamente con los postulantes.

---

## ✨ Características Principales

- **Doble Rol de Usuario:** Registro diferenciado para `Candidatos` y `Empleadores`.
- **Perfiles Profesionales:**
    - Los candidatos pueden construir un currículum en línea detallando experiencia laboral, educación y habilidades.
    - Las empresas pueden crear un perfil público con su descripción, industria y logo.
- **Publicación de Empleos:** Los empleadores pueden crear, editar y gestionar sus ofertas de trabajo.
- **Sistema de Postulación:** Los candidatos pueden postularse a las ofertas con un solo clic.
- **Chat en Tiempo Real:** Módulo de mensajería directa para facilitar la comunicación entre empleadores y candidatos.
- **Sistema de Reseñas:** Ambas partes pueden dejar una reseña y una calificación, fomentando la transparencia.
- **Búsqueda y Filtros:** Búsqueda de empleos por categoría, ubicación y tipo de contrato.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend (App Móvil):** **Flutter** - Para crear una aplicación nativa para iOS y Android desde una única base de código.
- **Backend & Base de Datos:** **Supabase** - Una plataforma de backend como servicio que utiliza **PostgreSQL**, proporcionando API automática, autenticación y funcionalidades en tiempo real.

---

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura moderna, utilizando un backend como servicio que centraliza la lógica y los datos.

```mermaid
graph TD
    subgraph "Usuarios de Outy"
        A[👤 Candidato]
        B[🏢 Empleador]
    end

    subgraph "Aplicación Móvil"
        C(📱 App con Flutter)
    end

    subgraph "Backend como Servicio"
        D(⚙️ Supabase <br> API y Autenticación)
        E(🗄️ Base de Datos PostgreSQL)
    end

    A -- Usa --> C
    B -- Usa --> C
    C <--> D
    D <--> E

    style A fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style B fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style C fill:#CDEEFF,stroke:#0175C2,stroke-width:2px;
    style D fill:#DFF0D8,stroke:#3C763D,stroke-width:2px;
    style E fill:#D0E0F0,stroke:#336791,stroke-width:2px;
