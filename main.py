import pandas as pd

df = pd.read_excel("Ficha_de_Ingreso_de_Drogas.xls")

df.columns = [
    "Droga", "IdIngreso", "CertAnalisis", "Lote",
    "FechaRev", "Proveedor", "Remito", "Cantidad",
    "Envases", "FechaIngreso", "PrecioKG",
    "Extra1", "Observacion", "Folio", "Extra2"
]

df["FechaIngreso"] = pd.to_datetime(df["FechaIngreso"], errors="coerce")

df["PrecioKG"] = df["PrecioKG"].astype(str).str.extract(r'(\d+)')
df["PrecioKG"] = pd.to_numeric(df["PrecioKG"], errors="coerce")

df["Droga"] = df["Droga"].fillna("")

df["IdDroga"] = df["Droga"].astype("category").cat.codes + 1

print("\n LISTA DE DROGAS ")
print(df[["IdDroga", "Droga"]].drop_duplicates().sort_values("IdDroga"))

# ------------------ BUSQUEDA ------------------
nombre = input("\nIngrese el nombre de la droga: ").lower()

# Coincidencias
df_filtrado = df[df["Droga"].str.lower().str.contains(nombre, na=False)]

if df_filtrado.empty:
    print("No se encontró la droga")
else:
    # Obtener drogas únicas encontradas
    coincidencias = df_filtrado[["Droga", "IdDroga"]].drop_duplicates().reset_index(drop=True)

    # 🔥 Caso 1: UNA sola coincidencia → directo
    if len(coincidencias) == 1:
        droga_elegida = coincidencias.iloc[0]["Droga"]

    # 🔥 Caso 2: varias coincidencias → elegir
    else:
        print("\nCoincidencias encontradas:")
        for i, row in coincidencias.iterrows():
            print(f"{i+1} - {row['Droga']} (ID: {row['IdDroga']})")

        opcion = int(input("\nSeleccione una opción: ")) - 1
        droga_elegida = coincidencias.iloc[opcion]["Droga"]

    # Filtrar la droga elegida
    df_final = df[df["Droga"] == droga_elegida]

    # Ordenar por fecha
    df_ordenado = df_final.sort_values(by="FechaIngreso", ascending=False)

    ultimo = df_ordenado.iloc[0]

    print("\n--- RESULTADO ---")
    print("Droga:", ultimo["Droga"])
    print("ID Droga:", ultimo["IdDroga"])
    print("Último precio por KG:", int(ultimo["PrecioKG"]))
    print("Fecha:", ultimo["FechaIngreso"].strftime("%Y-%m-%d"))