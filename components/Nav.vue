<template>
  <nav
    class="fixed bg-black-5 z-10 top-0 flex flex-col text-white text-center content-center sm:flex-row sm:text-left sm:justify-between py-2 px-6 shadow sm:items-baseline w-full"
  >
    <div class="mb-2 sm:mb-0 inner">
      <nuxt-link
        to="/"
        class="text-3xl no-underline text-grey-darkest hover:text-blue-dark font-sans font-bold"
      >
        <span class="text-green-logo">s</span
        ><span class="text-blue-logo">b</span>
      </nuxt-link>
    </div>

    <div class="sm:mb-0 self-center">
      <nuxt-link
        to="/development"
        class="text-md no-underline text-grey-darker hover:text-blue-dark sm:ml-2 px-1"
      >
        development
      </nuxt-link>

      <nuxt-link
        to="/photography"
        class="text-md no-underline text-grey-darker hover:text-blue-dark sm:ml-2 px-1"
      >
        photography
      </nuxt-link>
    </div>
  </nav>
</template>

<style lang="scss" scoped></style>
