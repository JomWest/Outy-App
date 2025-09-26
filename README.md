# Outy - Bolsa de Trabajo para Nicaragua

![Logo de Outy](assets/outy_logo.png) **Outy** es una plataforma de código abierto diseñada para conectar a profesionales y empresas en Nicaragua. Su objetivo es centralizar y simplificar el proceso de búsqueda y publicación de empleos en el país, creando un puente directo entre el talento local y las oportunidades laborales.

[![Estado del Build](https://img.shields.io/badge/build-passing-FF42A5?style=flat&logo=github&logoColor=white)](https://github.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-6B46F1?style=flat&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![SQL Server](https://img.shields.io/badge/Database-SQL%20Server-007BFF?style=flat&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/es-es/sql-server)


---

## 📋 Tabla de Contenidos
1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [✨ Características Principales](#-características-principales)
3. [🛠️ Tecnologías Utilizadas](#-tecnologías-utilizadas)
4. [🗄️ Diseño de la Base de Datos](#-diseño-de-la-base-de-datos)
5. [📄 Licencia](#-licencia)

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
- **Sistema de Postulación:** Los candidatos pueden postularse a las ofertas con un solo clic, adjuntando opcionalmente una carta de presentación.
- **Chat en Tiempo Real:** Módulo de mensajería directa para facilitar la comunicación entre empleadores y candidatos sobre una postulación.
- **Sistema de Reseñas:** Después de un proceso de selección, ambas partes pueden dejar una reseña y una calificación, fomentando la transparencia.
- **Búsqueda y Filtros:** Búsqueda de empleos por categoría, ubicación (departamento/municipio de Nicaragua), tipo de contrato y más.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto está diseñado para ser flexible, pero la estructura base recomendada es:

- **Base de Datos:** `Microsoft SQL Server`
- **Backend (Sugerido):**
    - `ASP.NET Core`: Para una integración nativa con SQL Server y un alto rendimiento.
    - `Node.js` con `Express` y `Prisma` o `TypeORM`: Para un desarrollo rápido y flexible.
- **Frontend (Sugerido):**
    - `React` o `Next.js`: Para una interfaz de usuario dinámica y moderna.
    - `Angular`: Para una solución empresarial robusta.
    - `Vue.js`: Para una curva de aprendizaje más suave y gran flexibilidad.
- **Comunicación en Tiempo Real (Chat):**
    - `SignalR` (si se usa .NET)
    - `Socket.IO` (si se usa Node.js)

---

## 🗄️ Diseño de la Base de Datos

La base de datos es el núcleo de la aplicación. Está diseñada de manera relacional y normalizada para garantizar la integridad y escalabilidad de los datos.

El script completo de la base de datos se encuentra en: `database/schema.sql`

A continuación, un diagrama de Entidad-Relación simplificado de las tablas principales:

```mermaid
erDiagram
    users {
        UNIQUEIDENTIFIER id PK
        string email
        string password_hash
        string role
    }

    company_profiles {
        UNIQUEIDENTIFIER user_id PK, FK
        string company_name
        string description
    }

    candidate_profiles {
        UNIQUEIDENTIFIER user_id PK, FK
        string full_name
        string professional_title
    }

    jobs {
        UNIQUEIDENTIFIER id PK
        UNIQUEIDENTIFIER company_id FK
        string title
        string description
    }

    job_applications {
        UNIQUEIDENTIFIER id PK
        UNIQUEIDENTIFIER job_id FK
        UNIQUEIDENTIFIER candidate_id FK
        string status
    }

    reviews {
        UNIQUEIDENTIFIER id PK
        UNIQUEIDENTIFIER job_application_id FK
        int rating
        string comment
    }

    users ||--o{ company_profiles : "es un"
    users ||--o{ candidate_profiles : "es un"
    company_profiles ||--|{ jobs : "publica"
    candidate_profiles ||--|{ job_applications : "realiza"
    jobs ||--|{ job_applications : "recibe"
    job_applications ||--o{ reviews : "genera"
