# Outy - Bolsa de Trabajo para Nicaragua

![Logo de Outy](assets/outy_logo.png)

**Outy** es una plataforma de código abierto diseñada para conectar a profesionales y empresas en Nicaragua. Su objetivo es centralizar y simplificar el proceso de búsqueda y publicación de empleos en el país, creando un puente directo entre el talento local y las oportunidades laborales.

[![Estado del Build](https'://img.shields.io/badge/build-passing-FF42A5?style=flat&logo=github&logoColor=white)](https://github.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-6B46F1?style=flat&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![SQL Server](https://img.shields.io/badge/Database-SQL%20Server-007BFF?style=flat&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/es-es/sql-server)

---

## 📋 Tabla de Contenidos
1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Características Principales](#-características-principales)
3. [Arquitectura del Sistema](#️-arquitectura-del-sistema)
4. [Diseño de la Base de Datos](#-diseño-de-la-base-de-datos)
5. [Licencia](#-licencia)

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

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura de tres capas clásica, separando la presentación, la lógica de negocio y el almacenamiento de datos para mayor escalabilidad y mantenibilidad.

```mermaid
graph TD
    subgraph "Usuarios de Outy"
        A[👤 Candidato]
        B[🏢 Empleador]
    end

    subgraph "Capa de Presentación (Frontend)"
        C(🌐 Web / App Móvil)
    end

    subgraph "Capa de Lógica (Backend API)"
        D(⚙️ API / Lógica del negocio)
    end

    subgraph "Capa de Datos"
        E(🗄️ SQL Server Database)
    end

    A -- Accede a --> C
    B -- Accede a --> C
    C <--> D
    D <--> E

    style A fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style B fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style C fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px;
    style D fill:#FFF3CD,stroke:#8A6D3B,stroke-width:2px;
    style E fill:#F2DEDE,stroke:#A94442,stroke-width:2px;
