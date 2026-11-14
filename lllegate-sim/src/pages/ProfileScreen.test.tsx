import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { expect, it } from "vitest"
import { ProfileScreen } from "./ProfileScreen"

it("closes the API session and navigates to sign-in", async () => {
  window.localStorage.setItem(
    "llegate_sesion_v1",
    JSON.stringify({
      access_token: "access-test",
      refresh_token: "refresh-test",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }),
  )

  render(
    <MemoryRouter initialEntries={["/perfil"]}>
      <Routes>
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/ingresar" element={<h1>Ingresar</h1>} />
      </Routes>
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))

  expect(await screen.findByRole("heading", { name: "Ingresar" })).toBeInTheDocument()
  expect(window.localStorage.getItem("llegate_sesion_v1")).toBeNull()
})
