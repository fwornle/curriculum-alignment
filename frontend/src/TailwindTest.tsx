import React from 'react'

export const TailwindTest: React.FC = () => {
  return (
    <div className="p-8 bg-blue-500 text-white">
      <h1 className="text-4xl font-bold mb-4">Tailwind Test</h1>
      <div className="bg-red-500 p-4 rounded-lg mb-4">
        <p className="text-xl">Red background with padding and rounded corners</p>
      </div>
      <div className="bg-green-500 p-4 rounded-lg mb-4">
        <p className="text-xl">Green background</p>
      </div>
      <button className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
        Purple Button
      </button>
    </div>
  )
}