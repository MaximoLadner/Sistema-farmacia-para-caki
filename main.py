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


df["IdDroga"] = df["Droga"].astype("category").cat.codes + 1


print("\n LISTA DE DROGAS ")
print(df[["IdDroga", "Droga"]].drop_duplicates().sort_values("IdDroga"))

nombre = input("\nIngrese el nombre de la droga: ").lower()

df_filtrado = df[df["Droga"].str.lower().str.contains(nombre)]

if df_filtrado.empty:
    print("No se encontró la droga")
else:
    
    df_ordenado = df_filtrado.sort_values(by="FechaIngreso", ascending=False)

    ultimo = df_ordenado.iloc[0]

    print("\n--- RESULTADO ---")
    print("Droga:", ultimo["Droga"])
    print("ID Droga:", ultimo["IdDroga"])
    print("Último precio por KG:", ultimo["PrecioKG"])
    print("Fecha:", ultimo["FechaIngreso"])