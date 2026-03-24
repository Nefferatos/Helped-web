import MaidProfileForm from '../components/MaidProfileForm'

export default function MaidProfilePage() {
  return (
    <div style={{ padding: '2rem', background: '#f3f5f8', minHeight: '100vh' }}>
      <header style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Maid Profile Registration</h1>
        <p style={{ color: '#555' }}>Complete the bio-data fields and submit the profile to the backend.</p>
      </header>

      <main style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <MaidProfileForm />
      </main>
    </div>
  )
}
