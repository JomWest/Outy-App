# Outy - Bolsa de Trabajo para Nicaragua

![Logo de Outy](assets/outy_logo.png)

**Outy** es una plataforma de código abierto diseñada para conectar a profesionales y empresas en Nicaragua. Su objetivo es centralizar y simplificar el proceso de búsqueda y publicación de empleos en el país, creando un puente directo entre el talento local y las oportunidades laborales.

[![Estado del Build](https://img.shields.io/badge/build-passing-FF42A5?style=flat&logo=github&logoColor=white)](https://github.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-6B46F1?style=flat&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/Frontend-React_Native-61DAFB?style=flat&logo=react&logoColor=white)](https://reactnative.dev/)
[![SQL Server](https://img.shields.io/badge/Database-SQL_Server-CC2927?style=flat&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/es-es/sql-server)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

---

## 📋 Tabla de Contenidos

1.  [Descripción del Proyecto](#-descripción-del-proyecto)
2.  [Características Principales](#-características-principales)
3.  [Tecnologías Utilizadas](#️-tecnologías-utilizadas)
4.  [Arquitectura del Sistema](#️-arquitectura-del-sistema)

---

## 🎯 Descripción del Proyecto

El mercado laboral en Nicaragua a menudo se encuentra fragmentado en diversas plataformas y redes sociales. **Outy** nace como una solución moderna y centralizada para abordar este desafío. La plataforma ofrece herramientas especializadas tanto para **candidatos** que buscan activamente empleo, como para **empresas y reclutadores** que necesitan encontrar al profesional ideal.

-   **Para Candidatos:** Permite crear un perfil profesional completo, subir su CV, detallar su experiencia y educación, y postularse a ofertas de manera sencilla.
-   **Para Empleadores:** Ofrece un portal para publicar y gestionar ofertas de trabajo, buscar perfiles de candidatos, y comunicarse directamente con los postulantes.

---

## ✨ Características Principales

-   **Doble Rol de Usuario:** Registro diferenciado para `Candidatos` y `Empleadores`.
-   **Perfiles Profesionales:**
    -   Los candidatos pueden construir un currículum en línea detallando experiencia laboral, educación y habilidades.
    -   Las empresas pueden crear un perfil público con su descripción, industria y logo.
-   **Publicación de Empleos:** Los empleadores pueden crear, editar y gestionar sus ofertas de trabajo.
-   **Sistema de Postulación:** Los candidatos pueden postularse a las ofertas con un solo clic.
-   **Chat en Tiempo Real:** Módulo de mensajería directa para facilitar la comunicación entre empleadores y candidatos.
-   **Sistema de Reseñas:** Ambas partes pueden dejar una reseña y una calificación, fomentando la transparencia.
-   **Búsqueda y Filtros:** Búsqueda de empleos por categoría, ubicación y tipo de contrato.

---

## 🛠️ Tecnologías Utilizadas

-   **Frontend (App Móvil):** **React Native (con Expo)** - Para crear una aplicación nativa para iOS y Android desde una única base de código usando JavaScript y React.
-   **Backend (API):** **Node.js** - Para construir una API RESTful robusta y escalable que maneja toda la lógica de negocio y la comunicación con la base de datos.
-   **Base de Datos:** **SQL Server & SQLite** - Se utiliza **SQL Server** como motor principal en producción para garantizar robustez y escalabilidad, mientras que **SQLite** se emplea para el desarrollo local, facilitando la configuración y agilizando las pruebas.

---

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura cliente-servidor tradicional, donde la aplicación móvil (cliente) se comunica con una API RESTful (servidor) que gestiona la lógica y el acceso a los datos.

```mermaid
graph TD
    subgraph "Usuarios de Outy"
        A[👤 Candidato]
        B[🏢 Empleador]
    end

    subgraph "Aplicación Móvil"
        C(📱 App con React Native y Expo)
    end

    subgraph "Backend"
        D(⚙️ API con Node.js)
    end
    
    subgraph "Base de Datos"
      E(🗄️ SQL Server / SQLite)
    end

    A -- Usa --> C
    B -- Usa --> C
    C -- Comunica con --> D
    D -- Accede a --> E

    style A fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style B fill:#D9EDF7,stroke:#31708F,stroke-width:2px;
    style C fill:#E0F5FE,stroke:#00D8FF,stroke-width:2px;
    style D fill:#DFF0D8,stroke:#3C763D,stroke-width:2px;
    style E fill:#F5E0E0,stroke:#CC2927,stroke-width:2px;
